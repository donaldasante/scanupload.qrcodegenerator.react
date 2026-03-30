import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { postData } from './apiClient';
import { debounceAsync, isExpired, isNullOrEmpty } from './utilities';
import { StorageAdapter, browserStorageAdapter } from './storage';
import { QrCodeGeneratorState, SessionResponse, TokenResponse, UploadedFile } from './types';

const LAST_SESSION_IDS_KEY = 'qrcode-last-session-ids';

const INITIAL_STATE: QrCodeGeneratorState = {
    loading: true,
    isConnected: false,
    retry: false,
    deviceLoginUrl: '',
    uploadedFiles: []
};

export interface QrCodeGeneratorCoreOptions {
    sessionUrl: string;
    refreshTokenUrl: string;
    /**
     * Optional storage adapter. Defaults to browser localStorage.
     * Supply a custom adapter for SSR, testing, or non-browser environments.
     */
    storage?: StorageAdapter;
}

export class QrCodeGeneratorCore {
    private _state: QrCodeGeneratorState = { ...INITIAL_STATE };
    private readonly _listeners = new Set<() => void>();
    private _session: SessionResponse | null = null;
    private _connection: HubConnection | null = null;
    private _abortController: AbortController | null = null;
    private _token = '';
    private _retryCount = 0;
    private _lastSessionIds: string[] = [];

    private readonly _storage: StorageAdapter;
    private readonly sessionUrl: string;
    private readonly refreshTokenUrl: string;

    // Debounced version of _getData — stable across calls, bound to this instance.
    private readonly _debouncedGetData = debounceAsync(() => this._getData(), 1000);

    constructor(options: QrCodeGeneratorCoreOptions) {
        this.sessionUrl = options.sessionUrl;
        this.refreshTokenUrl = options.refreshTokenUrl;
        this._storage = options.storage ?? browserStorageAdapter;
        this._lastSessionIds = this._storage.getItem<string[]>(LAST_SESSION_IDS_KEY) ?? [];
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
        if (isNullOrEmpty(this.sessionUrl)) return;

        this._abortController = new AbortController();
        const signal = this._abortController.signal;

        const hubUrl = await this._getHubUrlAsync(signal);
        if (signal.aborted) return;

        const connection = await this._createHubConnectionAsync(hubUrl);
        try {
            await connection?.start();

            if (signal.aborted) {
                await connection?.stop();
                return;
            }

            this._connection = connection ?? null;
            this._setState({ isConnected: true, loading: false, retry: false });
            console.log('SignalR Connected successfully');
        } catch (err) {
            if (!signal.aborted) {
                console.error(err);
            }
        }
    }

    dispose(): void {
        this._abortController?.abort();
        this._abortController = null;
        this._session = null;

        if (this._connection) {
            this._connection.stop().catch(console.error);
            this._connection = null;
        }
    }

    async retrySession(): Promise<void> {
        await this._deleteCurrentSession();

        const connection = await this._debouncedGetData();
        this._connection = connection ?? null;
        await connection?.start();

        this._setState({ isConnected: true, loading: false, retry: false });
    }

    // ─── Private helpers ────────────────────────────────────────────────────────

    private _setState(partial: Partial<QrCodeGeneratorState>): void {
        this._state = { ...this._state, ...partial };
        this._listeners.forEach((l) => l());
    }

    private async _getAccessToken(): Promise<string> {
        try {
            if (!this._token || isExpired(this._token, 60)) {
                const response = await postData<TokenResponse>(this.refreshTokenUrl, {
                    timeout: 160000
                });
                this._token = response.access_token;
            }
            return this._token;
        } catch (error) {
            console.error('Error fetching access token:', error);
            throw error;
        }
    }

    private async _getSessionInformationAsync(signal?: AbortSignal): Promise<void> {
        if (this._session) return;
        this._setState({ loading: true });
        try {
            const response = await postData<SessionResponse>(
                this.sessionUrl,
                { lastSessionIds: this._lastSessionIds },
                { timeout: 300000, signal }
            );
            if (signal?.aborted) return;
            this._session = response;
            this._setState({ deviceLoginUrl: this._buildDeviceLoginUrl(response) });
            this._lastSessionIds = [response.sessionId];
            this._storage.setItem(LAST_SESSION_IDS_KEY, this._lastSessionIds);
        } catch (error) {
            if (signal?.aborted) return;
            this._setState({ retry: true, loading: false });
        }
    }

    private async _getHubUrlAsync(signal?: AbortSignal): Promise<string> {
        await this._getSessionInformationAsync(signal);
        return this._session?.hubUrl ?? '';
    }

    private async _getData(): Promise<HubConnection | null | undefined> {
        const hub = await this._getHubUrlAsync();
        return this._createHubConnectionAsync(hub);
    }

    private async _deleteCurrentSession(): Promise<void> {
        this._setState({ isConnected: false, retry: false, uploadedFiles: [] });
        this._session = null;
        if (this._connection) {
            await this._connection.stop();
            this._connection = null;
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
                    transport: 1, // prefer wss
                    accessTokenFactory: () => this._getAccessToken()
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
                            ? { ...serverFile, thumbnailBase64: existing.thumbnailBase64 ?? serverFile.thumbnailBase64 }
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
