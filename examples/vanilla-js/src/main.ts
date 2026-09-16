import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import XHRUpload from '@uppy/xhr-upload';
import ScanUploadPlugin from '@scanupload/qr-code-generator-uppy';
import { QrCodeGeneratorElement, type QrCodeGeneratorElementSetOptions } from '@scanupload/qr-code-generator-vanilla';

// The Uppy Dashboard ships its own stylesheet. Without it the Dashboard renders
// as unstyled HTML — a native "browse files" button, a stray "Powered by Uppy"
// link, and content stacked at the top of a mostly empty box.
// Imported before the demo CSS so our overrides win.
import '@uppy/dashboard/css/style.min.css';
// When overriding styles, import the base CSS then your overrides.
import '@scanupload/qr-code-generator-vanilla/dist/index.css';
import './index.css';
import './override.css';

if (import.meta.env.PROD) {
    console.log = () => {};
}

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
function requiredEnv(value: string | undefined, name: string): string {
    if (!value) {
        throw new Error(`${name} is not set. Copy .env.example to .env.local or provide it as a Docker build argument.`);
    }
    return value;
}

const sessionUrl = requiredEnv(import.meta.env.VITE_SESSION_URL, 'VITE_SESSION_URL');
const clientId = requiredEnv(import.meta.env.VITE_CLIENT_ID, 'VITE_CLIENT_ID');
/** Where Uppy sends files. Defaults to the mock endpoint in `vite.config.js`. */
const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/demo-upload';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const widgetContainer = $('widget-container');
const uppyContainer = $('uppy-container');
const uploadBox = document.querySelector<HTMLElement>('.upload-box');
const uppyShell = document.querySelector<HTMLElement>('.uppy-shell');

if (!widgetContainer || !uppyContainer || !uploadBox || !uppyShell) {
    throw new Error('Demo markup is incomplete — expected #widget-container, #uppy-container, .upload-box and .uppy-shell.');
}

// ── Uppy + ScanUpload wiring ────────────────────────────────────────────────
//
// The plugin owns the ScanUpload session and hands every file the phone sends
// to Uppy. The widget below renders the QR code for that same core, so both
// halves feed one Uppy instance and upload to the same place.

const uppy = new Uppy({
    autoProceed: true,
    allowMultipleUploadBatches: true
});

uppy.use(ScanUploadPlugin, { sessionUrl, clientId });

// Where Uppy sends files from either source. Swap for @uppy/tus or
// @uppy/aws-s3 without touching the ScanUpload plugin.
uppy.use(XHRUpload, {
    endpoint: uploadEndpoint,
    fieldName: 'file',
    getResponseData(xhr) {
        try {
            return JSON.parse(xhr.responseText || '{}');
        } catch {
            return { url: 'uploaded' };
        }
    }
});

// The Dashboard is the "drop files from this device" half. The plugin is
// headless, so Uppy works without it too.
uppy.use(Dashboard, {
    inline: true,
    target: uppyContainer,
    width: '100%',
    // Fill the host rather than a fixed size. Uppy writes this as an inline
    // style, so the host is what index.css controls — and the host mirrors the
    // QR square's measured height, which lines the drop zone up with it.
    height: '100%'
});

// ── QR widget ───────────────────────────────────────────────────────────────
//
// Bound to the plugin's core, so it renders the QR code for the session Uppy is
// already listening to instead of opening a second one. `injectStyles` is off
// because the stylesheet is imported at the top of this file, which is what
// lets `./override.css` win the cascade.
const plugin = uppy.getPlugin<ScanUploadPlugin>('ScanUpload');

const widget = new QrCodeGeneratorElement({
    container: widgetContainer,
    sessionUrl,
    clientId,
    core: plugin?.getCore() ?? null,
    showHeader: true,
    header: 'Scan to upload',
    showLogo: true,
    clickQrCodeToReload: true,
    filePreviewMode: 'list',
    size: 'large',
    injectStyles: false,
    showDownloadButton: false,
    showFilePreviews: false
});

void widget.start();

// ── Panel sizing ────────────────────────────────────────────────────────────
//
// The drop zone mirrors the QR square, so the two panels read as level: it
// starts on the square's line and is never shorter than it. Both figures are
// published on the upload box as `--scan-height` / `--scan-offset`.
//
// The dashed QR square is measured rather than the whole widget — the drop zone
// lines up with the code, not with the header above it or the reload hint
// below.

let scanObserver: ResizeObserver | null = null;
let observedSquare: Element | null = null;

function measureScan(): void {
    const square = widgetContainer!.querySelector<HTMLElement>('.sqg-qr-wrapper') ?? widgetContainer!;
    const squareBox = square.getBoundingClientRect();

    uploadBox!.style.setProperty('--scan-height', `${Math.round(squareBox.height)}px`);
    uploadBox!.style.setProperty('--scan-offset', `${Math.round(squareBox.top - widgetContainer!.getBoundingClientRect().top)}px`);

    // `setOptions` rebuilds the widget's DOM, so the square is a new element
    // after every control change — re-point the observer instead of leaving it
    // watching a detached node.
    if (square !== observedSquare) {
        if (observedSquare) scanObserver?.unobserve(observedSquare);
        scanObserver?.observe(square);
        observedSquare = square;
    }
}

// Watching the container catches the square appearing inside it; watching the
// square catches the size control changing it without the container moving.
// A control change also measures directly (see `applyOptions`) — resize
// observation is delivered on the rendering lifecycle, which a background tab
// throttles, and the measurement must not wait on that.
scanObserver = new ResizeObserver(measureScan);
scanObserver.observe(widgetContainer);
measureScan();

// ── Uppy file count → layout ────────────────────────────────────────────────

/**
 * The drop zone is pinned to the QR square's height while empty. `has-files`
 * lets it grow into the card's spare height instead, and hides the badge that
 * sits over the empty drop zone (see `.drop-icon` in index.css).
 */
function syncUppyFileCount(): void {
    uppyShell!.classList.toggle('has-files', uppy.getFiles().length > 0);
}

uppy.on('file-added', syncUppyFileCount);
uppy.on('file-removed', syncUppyFileCount);
uppy.on('cancel-all', syncUppyFileCount);
syncUppyFileCount();

// ── Settings panel ──────────────────────────────────────────────────────────
//
// Each control calls `setOptions` on the underlying element, which mutates the
// live widget in place (no remount).

type FilePreviewMode = 'list' | 'grid';
type QrCodeSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Applies widget options, then re-measures. `setOptions` replaces the QR
 * square, so the measurement is taken from the rebuilt DOM rather than waiting
 * for a resize observer callback to land.
 */
function applyOptions(options: QrCodeGeneratorElementSetOptions): void {
    void widget.setOptions(options).then(measureScan);
}

const headerText = $<HTMLInputElement>('headerText');
headerText?.addEventListener('input', () => {
    applyOptions({ header: headerText.value });
});

$<HTMLInputElement>('checkQrCodeLogo')?.addEventListener('change', (e) => {
    applyOptions({ showLogo: (e.target as HTMLInputElement).checked });
});

$<HTMLInputElement>('checkClickReload')?.addEventListener('change', (e) => {
    applyOptions({
        clickQrCodeToReload: (e.target as HTMLInputElement).checked
    });
});

$<HTMLInputElement>('checkHeader')?.addEventListener('change', (e) => {
    applyOptions({ showHeader: (e.target as HTMLInputElement).checked });
});

$<HTMLInputElement>('checkDownloadButton')?.addEventListener('change', (e) => {
    applyOptions({
        showDownloadButton: (e.target as HTMLInputElement).checked
    });
});

$<HTMLInputElement>('checkFilePreviews')?.addEventListener('change', (e) => {
    applyOptions({
        showFilePreviews: (e.target as HTMLInputElement).checked
    });
});

document.querySelectorAll<HTMLInputElement>('input[name="file-preview-mode"]').forEach((el) =>
    el.addEventListener('change', () => {
        if (el.checked) {
            applyOptions({ filePreviewMode: el.value as FilePreviewMode });
        }
    })
);

document.querySelectorAll<HTMLInputElement>('input[name="qr-code-size"]').forEach((el) =>
    el.addEventListener('change', () => {
        if (el.checked) {
            applyOptions({ size: el.value as QrCodeSize });
        }
    })
);
