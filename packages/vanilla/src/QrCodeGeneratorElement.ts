import {
    QrCodeGeneratorCore,
    type QrCodeGeneratorCoreOptions,
    type QrCodeGeneratorState,
    type UploadedFile
} from '@scanupload/qr-code-generator-core';
import { generateQrSvg } from './qrcode';
import { el, escapeHtml } from './domUtils';
import { REDO_SVG, QR_SCANNER_SVG } from './icons';
import { renderFileGrid, renderFileList } from './renderers';

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
}

// ── Element ────────────────────────────────────────────────────────────────

export class QrCodeGeneratorElement {
    private readonly _core: QrCodeGeneratorCore;
    private readonly _container: HTMLElement;
    private readonly _options: Required<
        Pick<QrCodeGeneratorElementOptions, 'showHeader' | 'showLogo' | 'clickQrCodeToReload' | 'filePreviewMode' | 'size'>
    > &
        QrCodeGeneratorElementOptions;

    private _unsubscribe: (() => void) | null = null;
    private _prevState: QrCodeGeneratorState | null = null;

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
    } | null = null;

    constructor(options: QrCodeGeneratorElementOptions) {
        this._options = {
            showHeader: false,
            showLogo: true,
            clickQrCodeToReload: false,
            filePreviewMode: 'grid',
            size: 'large',
            ...options
        };

        this._container = options.container;

        const { sessionUrl, refreshTokenUrl, storage } = options;
        this._core = new QrCodeGeneratorCore({ sessionUrl, refreshTokenUrl, storage });
    }

    // ── Public API ─────────────────────────────────────────────────────────

    async start(): Promise<void> {
        this._buildDom();
        this._unsubscribe = this._core.subscribe(() => this._render());
        await this._core.start();
    }

    dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
        this._core.dispose();
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

    // ── Initial DOM scaffold ───────────────────────────────────────────────

    private _buildDom(): void {
        const { showHeader, header, showLogo, clickQrCodeToReload, size } = this._options;
        const sizeConf = SIZE_MAP[size];

        // Root
        const root = el('section', 'relative overflow-hidden p-2');

        // Loading overlay
        const loadingOverlay = el('div', 'absolute inset-0 bg-white/90 flex items-center justify-center rounded-md z-10');
        loadingOverlay.innerHTML = `
            <div class="flex flex-col items-center text-center gap-2">
                <div class="rounded-full h-6 w-6 border-t-2 border-blue-800 border-dashed animate-spin"></div>
                <p class="text-gray-900 text-sm">Loading...</p>
            </div>`;
        root.appendChild(loadingOverlay);

        // Error overlay
        const errorOverlay = el('div', 'absolute inset-0 bg-white/90 flex items-center justify-center rounded-md z-10');
        errorOverlay.style.display = 'none';
        const retryBtn = el('button', 'bg-blue-300 text-white py-1 px-2 rounded-md hover:bg-blue-500 transition-colors');
        retryBtn.innerHTML = REDO_SVG;
        retryBtn.addEventListener('click', () => this.retrySession());
        errorOverlay.innerHTML = `<div class="flex flex-col items-center text-center mt-5 gap-2"><p class="text-gray-900 text-xs">Cannot create session</p></div>`;
        errorOverlay.querySelector('div')!.appendChild(retryBtn);
        root.appendChild(errorOverlay);

        // Content
        const content = el('div', 'flex flex-col items-center text-center');

        // Header
        const headerEl = el('header', 'mb-2');
        if (showHeader && header) {
            headerEl.innerHTML = `<h1 class="text-xl font-semibold text-gray-600">${escapeHtml(header)}</h1>`;
        }
        headerEl.style.display = showHeader && header ? '' : 'none';
        content.appendChild(headerEl);

        // QR wrapper
        const qrWrapper = el(
            'div',
            'bg-white p-2 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105 relative'
        );
        qrWrapper.setAttribute('aria-label', 'QR Code for file upload');
        qrWrapper.style.width = sizeConf.containerPx;
        qrWrapper.style.height = sizeConf.containerPx;

        if (clickQrCodeToReload) {
            qrWrapper.style.cursor = 'pointer';
            qrWrapper.addEventListener('click', () => this.retrySession());
        }

        const qrInner = el('div', 'relative inline-block w-full h-full');
        const qrCode = el('div', 'w-full h-full flex items-center justify-center');
        qrInner.appendChild(qrCode);
        qrWrapper.appendChild(qrInner);

        // Logo overlay
        const logoOverlay = el('div', 'absolute inset-0 flex items-center justify-center pointer-events-none');
        logoOverlay.style.display = showLogo ? '' : 'none';
        logoOverlay.innerHTML = `<div class="w-6 h-6 text-white bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-1 flex items-center justify-center">${QR_SCANNER_SVG}</div>`;
        qrInner.appendChild(logoOverlay);

        // sr-only
        const srOnly = el('p', 'sr-only');
        srOnly.textContent = 'QR Code that allows file uploads';
        qrWrapper.appendChild(srOnly);

        content.appendChild(qrWrapper);

        // Reload section
        const reloadSection = el('div', 'flex flex-row mt-3');
        if (!clickQrCodeToReload) {
            const reloadBtn = el(
                'button',
                'bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors flex items-center gap-3 text-sm border-none cursor-pointer'
            );
            reloadBtn.innerHTML = `${REDO_SVG}<span>Reload</span>`;
            reloadBtn.addEventListener('click', () => this.retrySession());
            reloadSection.appendChild(reloadBtn);
        } else {
            const hint = el('p', 'text-gray-500 text-sm');
            hint.textContent = 'Click QR code to reload';
            reloadSection.appendChild(hint);
        }
        content.appendChild(reloadSection);

        // File container
        const fileContainer = el('div');
        content.appendChild(fileContainer);

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
            fileContainer
        };

        // Initial render
        this._render();
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
                logo.className = state.isConnected
                    ? 'w-6 h-6 text-white bg-gradient-to-r from-green-200 to-green-500 rounded-2xl p-1 flex items-center justify-center'
                    : 'w-6 h-6 text-white bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-1 flex items-center justify-center';
            }
        }

        // Files
        if (!prev || prev.uploadedFiles !== state.uploadedFiles) {
            this._renderFiles(state.uploadedFiles);
        }

        this._prevState = state;
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
