import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { ApiError, postData } from './apiClient';
import { debounceAsync, isNullOrEmpty } from './utilities';
import { StorageAdapter, browserStorageAdapter } from './storage';
import { DownloadSessionZipResult, QrCodeGeneratorState, SessionResponse, UploadedFile } from './types';
import { triggerBrowserDownload } from './download';

const INITIAL_STATE: QrCodeGeneratorState = {
    loading: true,
    isConnected: false,
    retry: false,
    deviceLoginUrl: '',
    uploadedFiles: [],
    expiresAt: null,
    secondsRemaining: null,
    errorCode: null,
    sessionId: null,
    downloadUrl: null
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
     * Optional endpoint that streams all uploaded files for a session as a
     * ZIP archive. The core does **not** call this URL itself — it is
     * exposed via `QrCodeGeneratorCoreOptions` purely so UIs can render a
     * "Download" CTA that requests `GET <downloadUrl>?session_id=<id>`.
     * Auth is enforced by the hub's `FrontEndSessionPolicy` (cookie + Origin).
     */
    downloadUrl?: string;
    /**
     * Optional storage adapter. Defaults to browser localStorage.
     * Supply a custom adapter for SSR, testing, or non-browser environments.
     */
    storage?: StorageAdapter;
}

export type QrCodeGeneratorCoreSetOptions = Partial<
    Pick<QrCodeGeneratorCoreOptions, 'sessionUrl' | 'clientId' | 'downloadUrl'>
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
    private downloadUrl: string | undefined;
    private _hasStarted = false;

    // Debounced version of _getData — stable across calls, bound to this instance.
    private readonly _debouncedGetData = debounceAsync(() => this._getData(), 1000);

    constructor(options: QrCodeGeneratorCoreOptions) {
        this.sessionUrl = options.sessionUrl;
        this.clientId = options.clientId;
        this.downloadUrl = options.downloadUrl;
        this._storage = options.storage ?? browserStorageAdapter;
        // Mirror the configured downloadUrl onto state so reactive UIs can
        // observe whether the endpoint was wired up without having to thread
        // the option through.
        this._state.downloadUrl = options.downloadUrl ?? null;
    }

    /**
     * Whether a download is currently possible: a session is active AND
     * a `downloadUrl` was configured. Reactive adapters can use this in
     * combination with `setState` to drive a button's `disabled` state.
     */
    canDownloadZip(): boolean {
        return this._state.sessionId !== null && this._state.downloadUrl !== null;
    }

    /**
     * Fetches the session's uploaded-file ZIP from the configured
     * `downloadUrl`. The hub authenticates via the
     * `FrontEndSessionPolicy` cookie + `Origin`; `client_id` is read from
     * claims server-side, so the URL only needs the `session_id` query
     * param.
     *
     * The returned {@link DownloadSessionZipResult} carries either the
     * binary blob + filename (which should be passed to
     * {@link triggerBrowserDownload}) or a structured error.
     *
     * This method never throws and never calls `setState` — keeping the
     * download lifecycle entirely UI-side.
     */
    async downloadSessionZip(): Promise<DownloadSessionZipResult> {
        const sessionId = this._state.sessionId;
        const downloadUrl = this._state.downloadUrl;
        if (!sessionId || !downloadUrl) {
            return {
                ok: false,
                error: 'Download is not configured or no session is active.'
            };
        }

        const url = `${downloadUrl}?session_id=${encodeURIComponent(sessionId)}`;

        let response: Response;
        try {
            response = await fetch(url, { credentials: 'include' });
        } catch (err) {
            console.warn('Download network error:', err);
            return {
                ok: false,
                error: 'Network error \u2014 please try again.'
            };
        }

        if (!response.ok) {
            let msg = `Download failed (HTTP ${response.status}).`;
            try {
                const json = (await response.json()) as { error?: unknown };
                if (json && typeof json.error === 'string') msg = json.error;
            } catch {
                /* non-JSON body — keep the default message */
            }
            return { ok: false, error: msg, status: response.status };
        }

        // Resolve filename from Content-Disposition, falling back to a
        // deterministic default based on the session id.
        let filename = `${sessionId}.zip`;
        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            const ext = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
            const plain = /filename="?([^";]+)"?/i.exec(disposition);
            const match = ext ?? plain;
            if (match) filename = decodeURIComponent(match[1]);
        }

        const blob = await response.blob();
        return { ok: true, filename, blob };
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

        // Bypass the debounce here: the user explicitly requested a reload, so
        // we want the new session to go out immediately. The debounce exists
        // to coalesce rapid-fire session requests from re-mounts, not from
        // deliberate user interaction.
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
        const downloadUrl = options.downloadUrl ?? this.downloadUrl;

        const didChange =
            sessionUrl !== this.sessionUrl ||
            clientId !== this.clientId ||
            downloadUrl !== this.downloadUrl;
        if (!didChange) return;

        this.sessionUrl = sessionUrl;
        this.clientId = clientId;
        this.downloadUrl = downloadUrl;

        // Mirror the new downloadUrl onto state so subscribers see the
        // change without having to setState the field manually.
        if (this._state.downloadUrl !== (downloadUrl ?? null)) {
            this._setState({ downloadUrl: downloadUrl ?? null });
        }

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
        // Already have a session — nothing to fetch.
        if (this._session) return;

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
        return this._session?.hubUrl ?? '';
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
     * session endpoint. When the timer hits 0 the session is auto-cleaned:
     * the SignalR channel is stopped, the disconnect POST fires so the
     * server-side slot releases, and `state.retry` is flipped on so the
     * existing retry CTA surfaces (Logo turns red, the dead QR is
     * replaced by "Cannot create session — Reload").
     */
    private _startCountdown(ttlSeconds: number): void {
        this._stopCountdown();
        let remaining = Math.max(0, Math.ceil(ttlSeconds));
        this._setState({ secondsRemaining: remaining });
        this._countdownTimer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                // Fire-and-forget: the cleanup is async (awaits
                // `connection.stop()` and the disconnect POST) but the
                // state transitions inside `_deleteCurrentSession` are
                // synchronous, so the retry overlay appears immediately.
                // A subsequent `_deleteCurrentSession()` triggered by a
                // user click or a server-pushed `sessionDisconnected`
                // will simply observe `_session === null` and dedupe.
                void this._deleteCurrentSession({ setRetry: true });
                this._setState({ secondsRemaining: 0 });
                return;
            }
            this._setState({ secondsRemaining: remaining });
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

        let connection: HubConnection | undefined;
        try {
            connection = new HubConnectionBuilder()
                .withUrl(hubUrl, {
                    withCredentials: false,
                    transport: 1 // prefer wss — connects directly to the hub URL
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

            connection.on('sessionDisconnected', (_sessionId: string) => {
                // The hub has signalled that this session is gone. Tear
                // down the SignalR connection, POST `session/disconnect`
                // so the server-side slot releases (the same code path
                // as a manual retry), and surface the existing retry
                // overlay (Logo goes red, dead QR is replaced by
                // "Reload").
                void this._deleteCurrentSession({ setRetry: true });
            });

            connection.on('sessionReset', (_sessionId: string) => {
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
