import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { ApiError, postData } from './apiClient';
import { debounceAsync, isNullOrEmpty } from './utilities';
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
    errorCode: null
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

    // Debounced version of _getData — stable across calls, bound to this instance.
    private readonly _debouncedGetData = debounceAsync(() => this._getData(), 1000);

    constructor(options: QrCodeGeneratorCoreOptions) {
        this.sessionUrl = options.sessionUrl;
        this.clientId = options.clientId;
        this._storage = options.storage ?? browserStorageAdapter;
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
        await this._deleteCurrentSession();

        const connection = await this._debouncedGetData();
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

        const didChange = sessionUrl !== this.sessionUrl || clientId !== this.clientId;
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
            const response = await postData<SessionResponse>(
                this.sessionUrl,
                body,
                { timeout: 300000 }
            );
            this._session = response;
            this._setState({
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

    private async _deleteCurrentSession(): Promise<void> {
        this._stopCountdown();
        this._setState({
            isConnected: false,
            retry: false,
            uploadedFiles: [],
            expiresAt: null,
            secondsRemaining: null
        });

        // Capture the sessionId before nulling so the disconnect call has
        // something to send. A second `_deleteCurrentSession()` (e.g. from a
        // user spam-click racing retrySession() through the debouncer) will
        // see `this._session === null` here and skip the POST — no
        // duplicate network call.
        const sessionId = this._session?.sessionId;
        this._session = null;
        this._sessionPromise = null;

        // Best-effort server-side cancel. The hub releases the session slot
        // before we tear down the SignalR channel. Failures are swallowed —
        // we must not let a network blip (or an idempotent 404 from a
        // server-pushed `sessionDisconnected`) block the local teardown that
        // retrySession() and on('sessionDisconnected') both depend on.
        if (sessionId) {
            await this._notifyServerDisconnect(sessionId);
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
     * session endpoint. The timer self-stops and parks `secondsRemaining` at
     * `0` once the session expires; consumers can detect that with a simple
     * `state.secondsRemaining <= 0` check or call `retrySession()` for a
     * fresh session.
     */
    private _startCountdown(ttlSeconds: number): void {
        this._stopCountdown();
        let remaining = Math.max(0, Math.ceil(ttlSeconds));
        this._setState({ secondsRemaining: remaining });
        this._countdownTimer = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
                this._stopCountdown();
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
                this._deleteCurrentSession();
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
