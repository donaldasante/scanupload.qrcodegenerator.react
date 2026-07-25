import {
    HubConnection,
    HubConnectionBuilder,
    HttpTransportType,
    LogLevel
} from '@microsoft/signalr';
import { ApiError, postData } from './apiClient';
import { isNullOrEmpty } from './utilities';
import { StorageAdapter, browserStorageAdapter } from './storage';
import { QrCodeGeneratorState, SessionResponse, UploadedFile } from './types';

const INITIAL_STATE: QrCodeGeneratorState = {
    loading: true,
    isConnected: false,
    retry: false,
    deviceLoginUrl: '',
    uploadedFiles: [],
    expiresAt: null,
    secondsRemaining: null,
    errorCode: null,
    sessionId: null
};

export interface QrCodeGeneratorCoreOptions {
    /**
     * `POST <sessionUrl>` is invoked with no body. The browser's automatic
     * `Origin` header is what authenticates the request; the response carries
     * the `hubUrl` the SignalR client connects to directly.
     */
    sessionUrl: string;
    /**
     * Optional client identifier (a tenant / Keycloak `client_id`). When set,
     * it is sent in the JSON body of the session-create request as
     * `{ "clientId": "..." }` so the hub can scope audit, rate-limits, and
     * per-client rules. Has no effect on the SignalR WebSocket connection.
     */
    clientId?: string;
    /**
     * Optional storage adapter. Defaults to browser localStorage.
     * Supply a custom adapter for SSR, testing, or non-browser environments.
     */
    storage?: StorageAdapter;
    /**
     * When `true` (the default), the core will automatically create a
     * fresh session once the current session's TTL elapses, so the SignalR
     * channel is reconnected against a non-expired `sessionId`. This
     * prevents 403s from the hub's `FrontEndSessionAuthorizationHandler`
     * when a reconnect kicks in past the TTL.
     *
     * Set to `false` to fall back to the legacy behaviour: when the TTL
     * elapses, surface the retry overlay and wait for the user to click
     * Reload.
     */
    autoResession?: boolean;
}

export type QrCodeGeneratorCoreSetOptions = Partial<
    Pick<QrCodeGeneratorCoreOptions, 'sessionUrl' | 'clientId'>
>;

export class QrCodeGeneratorCore {
    private _state: QrCodeGeneratorState = { ...INITIAL_STATE };
    private readonly _listeners = new Set<() => void>();
    private _session: SessionResponse | null = null;
    private _sessionPromise: Promise<void> | null = null;
    private _connection: HubConnection | null = null;
    private _abortController: AbortController | null = null;
    private _retryCount = 0;
    /** 1Hz tick that drives `state.secondsRemaining` from `response.ttlSeconds`. */
    private _countdownTimer: ReturnType<typeof setInterval> | null = null;

    private readonly _storage: StorageAdapter;
    private sessionUrl: string;
    private clientId: string | undefined;
    private _hasStarted = false;
    private _disposed = false;
    private readonly _autoResession: boolean;
    private _autoResessionInFlight = false;

    constructor(options: QrCodeGeneratorCoreOptions) {
        this.sessionUrl = options.sessionUrl;
        this.clientId = options.clientId;
        this._storage = options.storage ?? browserStorageAdapter;
        this._autoResession = options.autoResession ?? true;
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    getState(): QrCodeGeneratorState {
        return this._state;
    }

    subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    async start(): Promise<void> {
        this._hasStarted = true;
        if (isNullOrEmpty(this.sessionUrl)) return;

        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        const hubUrl = await this._getHubUrlAsync();
        if (signal.aborted) return;

        const connection = await this._createHubConnectionAsync(hubUrl);
        if (!connection) return;

        try {
            await connection.start();

            if (signal.aborted) {
                await connection.stop();
                return;
            }

            this._connection = connection;
            this._setState({ isConnected: true, loading: false, retry: false });
            console.log('SignalR Connected successfully');
        } catch (err) {
            if (!signal.aborted) {
                console.error(err);
                this._setState({ isConnected: false, loading: false, retry: true });
            }
        }
    }

    dispose(): void {
        this._disposed = true;
        this._abortController?.abort();
        this._abortController = null;

        // Intentionally preserve `_session` so that a remount (e.g. React Strict
        // Mode's dev-only double-invoke of effects) can reuse the existing session
        // instead of issuing a second session request. Use `retrySession()` to
        // explicitly obtain a fresh session.
        if (this._connection) {
            this._connection.stop().catch(console.error);
            this._connection = null;
        }
    }

    async retrySession(): Promise<void> {
        // Set loading *before* the teardown so the loading overlay covers
        // the QR area immediately — no flash of an empty/old QR code.
        this._setState({ loading: true, retry: false, deviceLoginUrl: '' });
        await this._deleteCurrentSession({ keepLoading: true });

        const connection = await this._getData();
        if (!connection) {
            this._setState({ isConnected: false, loading: false, retry: true });
            return;
        }

        try {
            await connection.start();
            this._connection = connection;
            this._setState({ isConnected: true, loading: false, retry: false });
        } catch (err) {
            console.error(err);
            this._setState({ isConnected: false, loading: false, retry: true });
        }
    }

    async setOptions(options: QrCodeGeneratorCoreSetOptions): Promise<void> {
        const sessionUrl = options.sessionUrl ?? this.sessionUrl;
        const clientId = options.clientId ?? this.clientId;

        const didChange =
            sessionUrl !== this.sessionUrl ||
            clientId !== this.clientId;
        if (!didChange) return;

        this.sessionUrl = sessionUrl;
        this.clientId = clientId;

        if (!this._hasStarted) return;

        this._setState({ loading: true, retry: false });
        await this.retrySession();
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private _setState(partial: Partial<QrCodeGeneratorState>): void {
        this._state = { ...this._state, ...partial };
        this._listeners.forEach((l) => l());
    }

    private async _getSessionInformationAsync(): Promise<void> {
        // Already have a session AND it has not yet expired — nothing to fetch.
        // The TTL check defends against reusing a cached `_session` past its
        // `expiresAt`: even if `_deleteCurrentSession` was somehow skipped
        // (e.g. a non-standard code path), we never hand an expired
        // `sessionId` to the SignalR `negotiate` call.
        if (this._session && !this._isSessionExpired()) return;

        // A session request is already in flight (e.g. a remount fired `start()`
        // again before the first request resolved). Reuse it instead of issuing a
        // duplicate request.
        if (this._sessionPromise) {
            await this._sessionPromise;
            return;
        }

        this._sessionPromise = this._fetchSessionInformation();
        try {
            await this._sessionPromise;
        } finally {
            this._sessionPromise = null;
        }
    }

    private _isSessionExpired(): boolean {
        const expiresAt = this._state.expiresAt;
        return typeof expiresAt === 'number' && Date.now() >= expiresAt;
    }

    private async _fetchSessionInformation(): Promise<void> {
        this._setState({ loading: true, errorCode: null });
        try {
            // The session endpoint derives identity from the browser's
            // automatic `Origin` header — no auth token is required. When a
            // `clientId` is configured it is sent in the JSON body so the hub
            // can scope audit / rate-limits per tenant/Keycloak client.
            const body = this.clientId ? { clientId: this.clientId } : undefined;
            const response = await postData<SessionResponse>(this.sessionUrl, body, { timeout: 300000 });
            this._session = response;
            this._setState({
                sessionId: response.sessionId,
                deviceLoginUrl: this._buildDeviceLoginUrl(response),
                expiresAt: Date.now() + response.ttlSeconds * 1000
            });
            this._startCountdown(response.ttlSeconds);
        } catch (error) {
            console.error('Error fetching session information:', error);
            this._handleSessionCreateError(error);
        }
    }

    /**
     * Translate errors from the session-create endpoint into state updates the
     * UI can react to:
     *  - 409 → the tenant reached `MaxActiveSessionsPerTenant`; the UI should
     *          show a tenant-limit message alongside the existing retry CTA.
     *  - 429 → the per-origin create-session rate limit was hit (default
     *          10 req/min/Origin+IP). The UI can prompt the user to wait and
     *          retry. Refresh cycles through `retrySession()`.
     *  - any other failure leaves `retry: true` and clears `errorCode`.
     */
    private _handleSessionCreateError(error: unknown): void {
        if (error instanceof ApiError) {
            this._setState({ retry: true, loading: false, errorCode: error.status });
            return;
        }
        this._setState({ retry: true, loading: false, errorCode: null });
    }

    private async _getHubUrlAsync(): Promise<string> {
        await this._getSessionInformationAsync();
        return this._upgradeToHttpsIfPageSecure(this._session?.hubUrl ?? '');
    }

    /**
     * If the page is being served over HTTPS, upgrade any `http://` URL the
     * hub returns to `https://`. This works around a common deployment issue
     * where a TLS-terminating reverse proxy (Traefik, nginx, Cloudflare, etc.)
     * sits in front of the hub and the hub's configured `PublicBaseUrl` is
     * still `http://...`. Without this upgrade, browsers block the
     * downstream SignalR negotiate + WebSocket requests as mixed content.
     *
     * The upgrade only flips the scheme — the host, port, path, and query
     * are preserved verbatim. URLs that already use `https://` are
     * returned unchanged. URLs that use `wss://` / `ws://` are also
     * handled (WS upgrades have the same mixed-content restriction).
     *
     * No-op in non-browser environments (no `window.location`).
     */
    private _upgradeToHttpsIfPageSecure(url: string): string {
        if (!url) return url;
        if (typeof window === 'undefined' || !window.location) return url;

        const isPageSecure = window.location.protocol === 'https:';
        if (!isPageSecure) return url;

        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'http:') {
                parsed.protocol = 'https:';
                console.warn(
                    '[QrCodeGeneratorCore] Hub URL was returned as http:// but the page is https://. ' +
                    'Auto-upgrading to https:// to avoid a mixed-content block. ' +
                    'For a permanent fix, set the hub\'s PublicBaseUrl (or ScanUploadAppSettings.PublicBaseUrl) to https://...'
                );
                return parsed.toString();
            }
            if (parsed.protocol === 'ws:') {
                parsed.protocol = 'wss:';
                console.warn(
                    '[QrCodeGeneratorCore] Hub URL was returned as ws:// but the page is https://. ' +
                    'Auto-upgrading to wss:// to avoid a mixed-content block.'
                );
                return parsed.toString();
            }
            return url;
        } catch {
            // Malformed URL — leave it alone and let the downstream fetch surface the real error.
            return url;
        }
    }

    private async _getData(): Promise<HubConnection | null | undefined> {
        const hub = await this._getHubUrlAsync();
        return this._createHubConnectionAsync(hub);
    }

    /**
     * @param options.setRetry  Flip `state.retry = true` as part of the
     *   teardown. Use this from terminal-state paths (TTL expiry,
     *   server-pushed disconnect) so the existing retry overlay surfaces.
     *   Manual `retrySession()` callers leave it `false` because they're
     *   about to start a fresh connection.
     *
     * Always `POST /disconnect` whenever there is a captured `sessionId`
     * (errors — 404 if the session is already gone, network blips, etc. —
     * are swallowed by `_notifyServerDisconnect` so the local teardown
     * is guaranteed to finish even when the hub is unreachable).
     *
     * We previously skipped the POST on the TTL-expiry and
     * `sessionDisconnected` paths on the assumption the hub had already
     * released the slot. In practice the server-side slot only clears when
     * the POST lands, so leaving it out meant sessions lingered server-
     * side until either a manual retry or an out-of-band cleanup ran.
     */
    private async _deleteCurrentSession(options: { setRetry?: boolean; keepLoading?: boolean } = {}): Promise<void> {
        this._stopCountdown();

        // Capture `sessionId` BEFORE we null `this._session` below. A second
        // concurrent `_deleteCurrentSession()` triggered by a user click or
        // a server-pushed `sessionDisconnected` will see `null` and skip
        // its own POST — keeping this duplicate-free.
        const sessionId = this._session?.sessionId;

        const patch: Partial<QrCodeGeneratorState> = {
            isConnected: false,
            deviceLoginUrl: '',
            uploadedFiles: [],
            expiresAt: null,
            secondsRemaining: null,
            sessionId: null
        };
        if (!options.keepLoading) {
            patch.loading = false;
            patch.retry = options.setRetry ?? false;
        }

        this._setState(patch);

        this._session = null;
        this._sessionPromise = null;

        // Fire-and-forget: the disconnect POST is best-effort and must
        // never block the teardown. Waiting on it (especially in
        // `retrySession`) delays the new-session POST, leaving the
        // loading overlay up for seconds with no network activity.
        if (sessionId) {
            void this._notifyServerDisconnect(sessionId);
        }

        if (this._connection) {
            await this._connection.stop();
            this._connection = null;
        }
    }

    /**
     * `POST /api/v2/front-end/session/disconnect?session_id={sessionId}`
     * — a best-effort cancel that lets the hub release the session slot
     * before we tear down the SignalR channel. Errors are intentionally
     * swallowed so this never breaks the caller's teardown flow.
     */
    private async _notifyServerDisconnect(sessionId: string): Promise<void> {
        let url: URL;
        try {
            url = new URL(this.sessionUrl);
        } catch {
            // sessionUrl is malformed — skip silently rather than throw.
            return;
        }
        // Derive the disconnect endpoint from sessionUrl by trimming any
        // trailing slash and appending `/disconnect`. The sessionId is
        // carried only in the query string per the simplified hub spec.
        url.pathname = `${url.pathname.replace(/\/$/, '')}/disconnect`;
        url.searchParams.set('session_id', sessionId);

        try {
            await postData(url.toString(), undefined, { timeout: 30000 });
        } catch (err) {
            console.warn('Disconnect notification failed (continuing local teardown):', err);
        }
    }

    /**
     * Start (or restart) the 1Hz countdown timer that drives
     * `state.secondsRemaining`. Callers pass the `ttlSeconds` returned by the
     * session endpoint.
     *
     * When the timer hits 0 the cached `sessionId` is past its TTL — the
     * hub's `FrontEndSessionAuthorizationHandler` will reject any subsequent
     * SignalR negotiate with 403 if we keep using it. To avoid that, the
     * timer calls `retrySession()` automatically: it tears down the dead
     * SignalR channel, POSTs `/disconnect` so the server-side slot
     * releases, then creates a fresh session and reconnects.
     *
     * A single-flight guard (`_autoResessionInFlight`) keeps a simultaneous
     * manual `retrySession()` call (e.g. the user clicking Reload at the
     * same moment) from issuing two parallel creates.
     *
     * If `autoResession` is disabled on the options, the timer falls back
     * to the old behaviour: tear down, surface the retry overlay, and wait
     * for the user to click Reload.
     */
    private _startCountdown(ttlSeconds: number): void {
        this._stopCountdown();
        let remaining = Math.max(0, Math.ceil(ttlSeconds));
        this._setState({ secondsRemaining: remaining });
        this._countdownTimer = setInterval(() => {
            remaining -= 1;
            if (remaining > 0) {
                this._setState({ secondsRemaining: remaining });
                return;
            }

            this._stopCountdown();
            this._setState({ secondsRemaining: 0 });

            if (this._disposed) return;

            if (!this._autoResession) {
                // Legacy behaviour: surface the retry overlay and wait for
                // the user to click Reload. The cached `_session` is
                // cleared inside `_deleteCurrentSession`.
                void this._deleteCurrentSession({ setRetry: true });
                return;
            }

            // Auto-resession: tear down the dead SignalR channel, POST
            // `/disconnect` so the server-side slot releases, then POST
            // `/session` for a fresh session and reconnect.
            //
            // `_deleteCurrentSession` clears `_session` synchronously, so a
            // concurrent manual `retrySession()` will see `null` and skip
            // its own duplicate POST. The single-flight guard below
            // additionally prevents a race where the timer fires *and* the
            // user clicks Reload in the same tick.
            if (this._autoResessionInFlight) return;
            this._autoResessionInFlight = true;
            void (async () => {
                try {
                    await this._deleteCurrentSession({ keepLoading: true });
                    await this.retrySession();
                } finally {
                    this._autoResessionInFlight = false;
                }
            })();
        }, 1000);
    }

    private _stopCountdown(): void {
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
    }

    private _buildDeviceLoginUrl(response: SessionResponse): string {
        return new URL(response.deviceLoginUrl).toString();
    }

    private async _createHubConnectionAsync(hubUrl: string): Promise<HubConnection | undefined> {
        if (!hubUrl || hubUrl.trim().length === 0) {
            console.log('Hub URL is empty, cannot create connection.');
            return undefined;
        }

        // Upgrade any `http://` (or `ws://`) the hub returned to `https://`
        // (or `wss://`) when the hosting page is HTTPS. Without this, a hub
        // sitting behind a TLS-terminating proxy that returns plain `http://`
        // URLs would have its SignalR negotiate + WebSocket requests blocked
        // by the browser as mixed content. `_getHubUrlAsync` already does
        // this for the live `hubUrl`, but this entry point is also called
        // from retry paths where the upgrade may not have run.
        hubUrl = this._upgradeToHttpsIfPageSecure(hubUrl);

        let connection: HubConnection | undefined;
        try {
            connection = new HubConnectionBuilder()
                .withUrl(hubUrl, {
                    withCredentials: false,
                    // WebSockets first, LongPolling as fallback. The previous
                    // code used `transport: 1` (WebSockets only), which means
                    // a transient WS failure surfaces as a hard error rather
                    // than falling back to negotiate-over-HTTP. The hub
                    // exposes both transports; allowing the fallback keeps
                    // the connection alive when the WS upgrade is blocked
                    // by a proxy.
                    transport:
                        HttpTransportType.WebSockets |
                        HttpTransportType.LongPolling,
                    // Negotiation must run so the hub can validate the
                    // `Origin` header against `session.Dns` in
                    // `FrontEndSessionAuthorizationHandler`. The browser
                    // automatically sets `Origin` on cross-origin requests,
                    // which is what the hub relies on for auth.
                    skipNegotiation: false,
                })
                .configureLogging(LogLevel.Information)
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: (retryContext) => Math.min(16000, Math.pow(2, retryContext.previousRetryCount) * 1000)
                })
                .build();

            connection.on('FileAdded', (message: UploadedFile) => {
                const current = this._state.uploadedFiles;
                if (current.some((f) => f.id === message.id)) return;
                this._setState({ uploadedFiles: [...current, message] });
            });

            connection.on('FileRemoved', (message: UploadedFile) => {
                const current = this._state.uploadedFiles;
                if (!current.some((f) => f.id === message.id)) return;
                this._setState({
                    uploadedFiles: current.filter((f) => f.id !== message.id)
                });
            });

            connection.on('FileProgress', (fileId: string, progress: number) => {
                this._setState({
                    uploadedFiles: this._state.uploadedFiles.map((file) => (file.id === fileId ? { ...file, progress } : file))
                });
            });

            connection.on('fileSendImageResized', (fileId: string, thumbnailBase64: string) => {
                this._setState({
                    uploadedFiles: this._state.uploadedFiles.map((file) => (file.id === fileId ? { ...file, thumbnailBase64 } : file))
                });
            });

            connection.on('FilesCleared', () => {
                this._setState({ uploadedFiles: [] });
            });

            connection.on('sessionDisconnected', () => {
                // The hub has signalled that this session is gone. Tear
                // down the SignalR connection, POST `session/disconnect`
                // so the server-side slot releases (the same code path
                // as a manual retry), and surface the existing retry
                // overlay (Logo goes red, dead QR is replaced by
                // "Reload").
                void this._deleteCurrentSession({ setRetry: true });
            });

            connection.on('sessionReset', () => {
                this._setState({ uploadedFiles: [] });
            });

            connection.onreconnecting((error) => {
                console.log('Connection lost, attempting to reconnect...', error);
                if (this._retryCount >= 4) {
                    this._setState({ isConnected: false });
                } else {
                    this._retryCount += 1;
                }
                console.log('Retry count:', this._retryCount);
            });

            connection.onreconnected(async (connectionId) => {
                console.log('Connection re-established:', connectionId);
                try {
                    const files = (await connection?.invoke<UploadedFile[]>('GetSessionFiles', this._session?.sessionId)) ?? [];
                    const prevMap = new Map(this._state.uploadedFiles.map((f) => [f.id, f]));
                    const merged = files.map((serverFile) => {
                        const existing = prevMap.get(serverFile.id);
                        return existing
                            ? {
                                  ...serverFile,
                                  thumbnailBase64: existing.thumbnailBase64 ?? serverFile.thumbnailBase64
                              }
                            : serverFile;
                    });
                    this._setState({ uploadedFiles: merged });
                } catch (err) {
                    console.error('Failed to resync files after reconnect:', err);
                }
                this._setState({ isConnected: true, loading: false, retry: false });
                this._retryCount = 0;
            });

            connection.onclose((error) => {
                console.log('Connection closed', error);
                this._setState({ isConnected: false, uploadedFiles: [] });
            });

            connection.serverTimeoutInMilliseconds = 60000;
            connection.keepAliveIntervalInMilliseconds = 15000;
        } catch (error) {
            console.error('SignalR Connection failed:', error);
            this._setState({ loading: false, retry: true });
        }

        return connection;
    }
}
