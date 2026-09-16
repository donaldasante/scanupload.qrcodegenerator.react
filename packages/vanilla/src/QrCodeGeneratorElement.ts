import {
    QrCodeGeneratorCore,
    triggerBrowserDownload,
    type QrCodeGeneratorCoreOptions,
    type QrCodeGeneratorCoreSetOptions,
    type QrCodeGeneratorState,
    type ScanUploadFileOrigin,
    type UploadedFile
} from '@scanupload/qr-code-generator-core';
import { generateQrSvg } from './qrcode';
import { el, escapeHtml } from './domUtils';
import { REDO_SVG, QR_SCANNER_SVG } from './icons';
import { renderFileGrid, renderFileList } from './renderers';
import { injectStyles } from './styles';

// ── Size config ────────────────────────────────────────────────────────────

type ComponentSize = 'small' | 'medium' | 'large' | 'xlarge';
type FilePreviewMode = 'grid' | 'list';

interface SizeConfig {
    containerPx: string;
    qrSize: number;
}

const SIZE_MAP: Record<ComponentSize, SizeConfig> = {
    small: { containerPx: '80px', qrSize: 200 },
    medium: { containerPx: '120px', qrSize: 200 },
    large: { containerPx: '160px', qrSize: 200 },
    xlarge: { containerPx: '192px', qrSize: 200 }
};

// ── Options ────────────────────────────────────────────────────────────────

export interface QrCodeGeneratorElementOptions extends QrCodeGeneratorCoreOptions {
    /** Host element to render into. */
    container: HTMLElement;
    /** Optional header text. */
    header?: string;
    /** Show the header. Default: false. */
    showHeader?: boolean;
    /** Show the logo overlay on the QR code. Default: true. */
    showLogo?: boolean;
    /** If true, clicking the QR code reloads the session instead of showing a reload button. Default: false. */
    clickQrCodeToReload?: boolean;
    /** File preview mode. Default: 'grid'. */
    filePreviewMode?: FilePreviewMode;
    /** Component size. Default: 'large'. */
    size?: ComponentSize;
    /** Automatically inject the built-in styles into <head>. Set to false when importing the CSS manually. Default: true. */
    injectStyles?: boolean;
    /**
     * Show a "Download all files" button beneath the file previews. When
     * clicked, it fetches every `UploadedFile.url` the SignalR hub has
     * surfaced and triggers a browser save for each. Default: false.
     */
    showDownloadButton?: boolean;
    /**
     * Render the list of files received from the phone inside the widget.
     *
     * Set to `false` when something else already renders them — most commonly an
     * Uppy Dashboard fed by `@scanupload/qr-code-generator-uppy` — so the same
     * files are not shown twice. `filePreviewMode` and `showDownloadButton` are
     * independent of this. Default: `true`.
     */
    showFilePreviews?: boolean;
    /**
     * Bind to an existing core instead of creating one. The injected core is
     * owned by whoever supplied it — most commonly the ScanUpload Uppy plugin —
     * so this element will neither start nor dispose it, and will not push
     * `sessionUrl` / `clientId` changes into it.
     */
    core?: QrCodeGeneratorCore | null;
    /**
     * Called for every file the hub is holding for this session — including
     * files that were already there when this client connected.
     *
     * Useful for routing files somewhere other than this widget: an uploader, an
     * application-owned list, or analytics. Pair it with `showFilePreviews: false`
     * to render them elsewhere. `origin` is `'restored'` when the file was found
     * during a reconnect resync rather than pushed live.
     */
    onFileAvailable?: (file: UploadedFile, origin: ScanUploadFileOrigin) => void;
    /** Called when the hub drops a single file. Not called for a full clear. */
    onFileRemoved?: (file: UploadedFile) => void;
    /** Called when every file is cleared at once: a session reset, or the session ending. */
    onFilesCleared?: (files: readonly UploadedFile[]) => void;
}

export type QrCodeGeneratorElementSetOptions = Partial<Omit<QrCodeGeneratorElementOptions, 'container'>>;

// ── Element ────────────────────────────────────────────────────────────────

export class QrCodeGeneratorElement {
    private readonly _core: QrCodeGeneratorCore;
    private readonly _container: HTMLElement;
    /** `false` when the core was supplied by the caller and must not be disposed. */
    private readonly _ownsCore: boolean;
    private _options: Required<
        Pick<
            QrCodeGeneratorElementOptions,
            | 'showHeader'
            | 'showLogo'
            | 'clickQrCodeToReload'
            | 'filePreviewMode'
            | 'size'
            | 'injectStyles'
            | 'showDownloadButton'
            | 'showFilePreviews'
        >
    > &
        QrCodeGeneratorElementOptions;

    private _unsubscribe: (() => void) | null = null;
    private _eventUnsubscribes: Array<() => void> = [];
    private _prevState: QrCodeGeneratorState | null = null;
    private _downloadInFlight = false;
    private _downloadErrorTimer: ReturnType<typeof setTimeout> | null = null;

    // Cached DOM references for efficient updates
    private _els: {
        root: HTMLElement;
        loadingOverlay: HTMLElement;
        errorOverlay: HTMLElement;
        headerEl: HTMLElement;
        qrWrapper: HTMLElement;
        qrInner: HTMLElement;
        logoOverlay: HTMLElement;
        reloadSection: HTMLElement;
        fileContainer: HTMLElement;
        downloadSection: HTMLElement | null;
        downloadBtn: HTMLButtonElement | null;
        downloadError: HTMLElement | null;
    } | null = null;

    constructor(options: QrCodeGeneratorElementOptions) {
        this._options = {
            showHeader: false,
            showLogo: true,
            clickQrCodeToReload: false,
            filePreviewMode: 'grid',
            size: 'large',
            injectStyles: true,
            showDownloadButton: false,
            showFilePreviews: true,
            ...options
        };

        this._container = options.container;

        this._ownsCore = options.core == null;
        this._core =
            options.core ??
            new QrCodeGeneratorCore({
                sessionUrl: options.sessionUrl,
                clientId: options.clientId,
                autoResession: options.autoResession ?? false,
                storage: options.storage
            });
    }

    // ── Public API ─────────────────────────────────────────────────────────

    async start(): Promise<void> {
        if (this._options.injectStyles) injectStyles();
        this._buildDom();
        this._unsubscribe = this._core.subscribe(() => this._render());
        this._eventUnsubscribes = [
            this._core.on('file-added', ({ file, origin }) => this._options.onFileAvailable?.(file, origin)),
            this._core.on('file-removed', ({ file }) => this._options.onFileRemoved?.(file)),
            this._core.on('files-cleared', ({ files }) => this._options.onFilesCleared?.(files))
        ];
        // An injected core is already running, and is not ours to start.
        if (this._ownsCore) await this._core.start();
    }

    dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
        for (const off of this._eventUnsubscribes) off();
        this._eventUnsubscribes = [];
        if (this._downloadErrorTimer) {
            clearTimeout(this._downloadErrorTimer);
            this._downloadErrorTimer = null;
        }
        // An injected core is owned by the caller and must survive this element.
        if (this._ownsCore) this._core.dispose();
        this._container.innerHTML = '';
        this._els = null;
        this._prevState = null;
    }

    async retrySession(): Promise<void> {
        await this._core.retrySession();
    }

    getState(): QrCodeGeneratorState {
        return this._core.getState();
    }

    async setOptions(options: QrCodeGeneratorElementSetOptions): Promise<void> {
        const coreOptions: QrCodeGeneratorCoreSetOptions = {};

        if (typeof options.sessionUrl === 'string') {
            coreOptions.sessionUrl = options.sessionUrl;
        }
        if (typeof options.clientId === 'string') {
            coreOptions.clientId = options.clientId;
        }

        const hasCoreOptionChanges = Object.keys(coreOptions).length > 0;
        if (this._ownsCore && hasCoreOptionChanges) {
            await this._core.setOptions(coreOptions);
        }

        this._options = {
            ...this._options,
            ...options,
            container: this._container
        };

        if (this._els) {
            this._buildDom();
        }
    }

    /** Underlying core instance — exposed so consumers can `subscribe` etc. */
    getCore(): QrCodeGeneratorCore {
        return this._core;
    }

    // ── Initial DOM scaffold ───────────────────────────────────────────────

    private _buildDom(): void {
        const { showHeader, header, showLogo, clickQrCodeToReload, size } = this._options;
        const sizeConf = SIZE_MAP[size];

        // Root
        const root = el('section', 'sqg-root');

        // Loading overlay
        const loadingOverlay = el('div', 'sqg-overlay');
        loadingOverlay.innerHTML = `
            <div class="sqg-loading-content">
                <div class="sqg-spinner"></div>
                <p class="sqg-loading-text">Loading...</p>
            </div>`;
        root.appendChild(loadingOverlay);

        // Error overlay
        const errorOverlay = el('div', 'sqg-overlay');
        errorOverlay.style.display = 'none';
        const retryBtn = el('button', 'sqg-retry-btn');
        retryBtn.innerHTML = REDO_SVG;
        retryBtn.addEventListener('click', () => this.retrySession());
        errorOverlay.innerHTML = `<div class="sqg-error-content"><p class="sqg-error-text">Cannot create session</p></div>`;
        errorOverlay.querySelector('div')!.appendChild(retryBtn);
        root.appendChild(errorOverlay);

        // Content
        const content = el('div', 'sqg-content');

        // Header
        const headerEl = el('header', 'sqg-header');
        if (showHeader && header) {
            headerEl.innerHTML = `<h1 class="sqg-header-title">${escapeHtml(header)}</h1>`;
        }
        headerEl.style.display = showHeader && header ? '' : 'none';
        content.appendChild(headerEl);

        // QR wrapper
        const qrWrapper = el('div', 'sqg-qr-wrapper');
        qrWrapper.setAttribute('aria-label', 'QR Code for file upload');
        qrWrapper.style.width = sizeConf.containerPx;
        qrWrapper.style.height = sizeConf.containerPx;

        if (clickQrCodeToReload) {
            qrWrapper.style.cursor = 'pointer';
            qrWrapper.addEventListener('click', () => this.retrySession());
        }

        const qrInner = el('div', 'sqg-qr-inner');
        const qrCode = el('div', 'sqg-qr-code');
        qrInner.appendChild(qrCode);
        qrWrapper.appendChild(qrInner);

        // Logo overlay
        const logoOverlay = el('div', 'sqg-logo-overlay');
        logoOverlay.style.display = showLogo ? '' : 'none';
        logoOverlay.innerHTML = `<div class="sqg-logo sqg-logo--disconnected">${QR_SCANNER_SVG}</div>`;
        qrInner.appendChild(logoOverlay);

        // sr-only
        const srOnly = el('p', 'sqg-sr-only');
        srOnly.textContent = 'QR Code that allows file uploads';
        qrWrapper.appendChild(srOnly);

        content.appendChild(qrWrapper);

        // Reload section
        const reloadSection = el('div', 'sqg-reload-section');
        if (!clickQrCodeToReload) {
            const reloadBtn = el('button', 'sqg-reload-btn');
            reloadBtn.innerHTML = `${REDO_SVG}<span>Reload</span>`;
            reloadBtn.addEventListener('click', () => this.retrySession());
            reloadSection.appendChild(reloadBtn);
        } else {
            const hint = el('p', 'sqg-hint-text');
            hint.textContent = 'Click QR code to reload';
            reloadSection.appendChild(hint);
        }
        content.appendChild(reloadSection);

        // File container
        const fileContainer = el('div');
        // Hidden rather than omitted so `_render` can keep skipping work without
        // special-casing a missing element.
        if (!this._options.showFilePreviews) {
            fileContainer.style.display = 'none';
        }
        content.appendChild(fileContainer);

        // Optional download section (rendered only when showDownloadButton is true)
        let downloadSection: HTMLElement | null = null;
        let downloadBtn: HTMLButtonElement | null = null;
        let downloadError: HTMLElement | null = null;
        if (this._options.showDownloadButton) {
            downloadSection = el('div', 'sqg-download');
            downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'sqg-download-btn';
            downloadBtn.addEventListener('click', () => {
                void this._handleDownloadClick();
            });
            downloadSection.appendChild(downloadBtn);
            downloadError = el('p', 'sqg-download-error');
            downloadError.setAttribute('role', 'alert');
            downloadError.style.display = 'none';
            downloadSection.appendChild(downloadError);
            content.appendChild(downloadSection);
        }

        root.appendChild(content);
        this._container.innerHTML = '';
        this._container.appendChild(root);

        this._els = {
            root,
            loadingOverlay,
            errorOverlay,
            headerEl,
            qrWrapper,
            qrInner: qrCode,
            logoOverlay,
            reloadSection,
            fileContainer,
            downloadSection,
            downloadBtn,
            downloadError
        };

        // Reset so the subsequent _render() treats every field as changed and
        // produces a full repaint (e.g. hides the loading overlay if the core
        // state is already non-loading when _buildDom is called from setOptions).
        this._prevState = null;

        // Initial render
        void this._render();
    }

    // ── Reactive render ────────────────────────────────────────────────────

    private async _render(): Promise<void> {
        if (!this._els) return;
        const state = this._core.getState();
        const prev = this._prevState;

        // Loading overlay
        if (!prev || prev.loading !== state.loading || prev.retry !== state.retry) {
            this._els.loadingOverlay.style.display = state.loading ? '' : 'none';
            this._els.errorOverlay.style.display = !state.loading && state.retry ? '' : 'none';
        }

        // QR code
        if (!prev || prev.deviceLoginUrl !== state.deviceLoginUrl) {
            const sizeConf = SIZE_MAP[this._options.size];
            const svg = await generateQrSvg(state.deviceLoginUrl, sizeConf.qrSize);
            // Only update if we still have els and URL hasn't changed again
            if (this._els && this._core.getState().deviceLoginUrl === state.deviceLoginUrl) {
                this._els.qrInner.innerHTML = svg;
                const svgEl = this._els.qrInner.querySelector('svg');
                if (svgEl) {
                    svgEl.classList.add('w-full', 'h-full');
                }
            }
        }

        // Logo connection state
        if (this._options.showLogo && (!prev || prev.isConnected !== state.isConnected)) {
            const logo = this._els.logoOverlay.querySelector('div');
            if (logo) {
                logo.className = state.isConnected ? 'sqg-logo sqg-logo--connected' : 'sqg-logo sqg-logo--disconnected';
            }
        }

        // Files
        if (this._options.showFilePreviews && (!prev || prev.uploadedFiles !== state.uploadedFiles)) {
            this._renderFiles(state.uploadedFiles);
        }

        // Download button label/count
        if (this._els.downloadBtn && (!prev || prev.uploadedFiles !== state.uploadedFiles)) {
            const count = countDownloadable(state.uploadedFiles);
            this._els.downloadBtn.disabled = this._downloadInFlight || count === 0;
            this._els.downloadBtn.textContent = this._downloadInFlight
                ? 'Downloading…'
                : count > 0
                  ? `Download all files (${count})`
                  : 'Download all files';
        }

        this._prevState = state;
    }

    // ── Download handler ──────────────────────────────────────────────────

    private async _handleDownloadClick(): Promise<void> {
        if (!this._els) return;
        this._clearDownloadError();
        const files = this._core.getState().uploadedFiles.filter((f) => Boolean(f.url));
        if (files.length === 0) return;

        this._downloadInFlight = true;
        void this._render();
        try {
            const results = await Promise.allSettled(files.map((file) => downloadFile(file)));
            const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
            if (failed.length > 0) {
                const firstReason = failed[0].reason;
                const message = firstReason instanceof Error ? firstReason.message : 'Some files failed to download.';
                this._showDownloadError(
                    failed.length === files.length
                        ? `All downloads failed. ${message}`
                        : `${failed.length} of ${files.length} files failed. ${message}`
                );
            }
        } finally {
            this._downloadInFlight = false;
            void this._render();
        }
    }

    private _showDownloadError(message: string): void {
        if (!this._els?.downloadError) return;
        this._els.downloadError.textContent = message;
        this._els.downloadError.style.display = '';
        if (this._downloadErrorTimer) clearTimeout(this._downloadErrorTimer);
        this._downloadErrorTimer = setTimeout(() => this._clearDownloadError(), 5000);
    }

    private _clearDownloadError(): void {
        if (!this._els?.downloadError) return;
        this._els.downloadError.textContent = '';
        this._els.downloadError.style.display = 'none';
        if (this._downloadErrorTimer) {
            clearTimeout(this._downloadErrorTimer);
            this._downloadErrorTimer = null;
        }
    }

    // ── File rendering ─────────────────────────────────────────────────────

    private _renderFiles(files: UploadedFile[]): void {
        if (!this._els) return;
        const container = this._els.fileContainer;

        if (files.length === 0) {
            container.innerHTML = '';
            return;
        }

        if (this._options.filePreviewMode === 'list') {
            renderFileList(container, files);
        } else {
            renderFileGrid(container, files);
        }
    }
}

// ── Module-level helpers ──────────────────────────────────────────────────

function countDownloadable(files: readonly UploadedFile[]): number {
    return files.reduce((n, f) => (f.url ? n + 1 : n), 0);
}

async function downloadFile(file: UploadedFile): Promise<void> {
    if (!file.url) {
        throw new Error(`No download URL for "${file.name}".`);
    }

    let response: Response;
    try {
        response = await fetch(file.url, { credentials: 'include' });
    } catch {
        throw new Error(`Network error downloading "${file.name}".`);
    }

    if (!response.ok) {
        throw new Error(`"${file.name}" download failed (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    triggerBrowserDownload(blob, file.name || deriveFilename(file.url));
}

function deriveFilename(url: string): string {
    try {
        const pathname = new URL(url, window.location.href).pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        return last ?? 'download';
    } catch {
        return 'download';
    }
}
