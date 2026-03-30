import {
    QrCodeController,
    QrCodeGeneratorElement,
    generateQrSvg,
    renderFileGrid,
    REDO_SVG,
    type QrCodeGeneratorState
} from '@scanupload/qr-code-generator-vanilla';

// ── Shared config ──────────────────────────────────────────────────────────

const SHARED_OPTIONS = {
    sessionUrl: '/scanupload-api/session',
    refreshTokenUrl: '/scanupload-api/token'
};

// ── Tab elements ───────────────────────────────────────────────────────────

const tabSplit = document.getElementById('tab-split')!;
const tabWidget = document.getElementById('tab-widget')!;
const panelSplit = document.getElementById('panel-split')!;
const panelWidget = document.getElementById('panel-widget')!;
const widgetContainer = document.getElementById('widget-container')!;

const ACTIVE_TAB_CLASS = 'flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 border-blue-600 text-blue-600';
const INACTIVE_TAB_CLASS =
    'flex-1 py-2 px-4 text-sm font-medium text-center border-b-2 border-transparent text-gray-500 hover:text-gray-700';

// ── Split mode (HTML + JS) ─────────────────────────────────────────────────

const loadingOverlay = document.getElementById('qr-loading-overlay')!;
const errorOverlay = document.getElementById('qr-error-overlay')!;
const errorRetryBtn = document.getElementById('qr-error-retry-btn')!;
const qrCode = document.getElementById('qr-code')!;
const qrWrapper = document.getElementById('qr-wrapper')!;
const logoIcon = document.getElementById('qr-logo-icon')!;
const filesContainer = document.getElementById('qr-files')!;

errorRetryBtn.innerHTML = REDO_SVG;

let splitController: QrCodeController | null = null;
let splitPrevState: QrCodeGeneratorState | null = null;

function startSplitMode(): void {
    splitPrevState = null;
    splitController = new QrCodeController({
        ...SHARED_OPTIONS,
        onChange: (state) => {
            void renderSplit(state);
        }
    });

    qrWrapper.addEventListener('click', splitClickHandler);
    errorRetryBtn.addEventListener('click', splitRetryHandler);
    splitController.start();
}

function stopSplitMode(): void {
    qrWrapper.removeEventListener('click', splitClickHandler);
    errorRetryBtn.removeEventListener('click', splitRetryHandler);
    splitController?.dispose();
    splitController = null;
    splitPrevState = null;

    // Reset DOM to initial state
    loadingOverlay.classList.add('hidden');
    errorOverlay.classList.add('hidden');
    qrCode.innerHTML = '';
    filesContainer.innerHTML = '';
    logoIcon.setAttribute('class', 'w-6 h-6 text-white bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-1');
}

function splitClickHandler(): void {
    splitController?.retrySession();
}

function splitRetryHandler(e: Event): void {
    e.stopPropagation();
    splitController?.retrySession();
}

async function renderSplit(state: QrCodeGeneratorState): Promise<void> {
    const prev = splitPrevState;

    if (prev?.loading !== state.loading || prev?.retry !== state.retry) {
        loadingOverlay.classList.toggle('hidden', !state.loading);
        errorOverlay.classList.toggle('hidden', state.loading || !state.retry);
    }

    if (prev?.deviceLoginUrl !== state.deviceLoginUrl) {
        const svg = await generateQrSvg(state.deviceLoginUrl, 200);
        if (splitController?.getState().deviceLoginUrl === state.deviceLoginUrl) {
            qrCode.innerHTML = svg;
            const svgEl = qrCode.querySelector('svg');
            if (svgEl) svgEl.classList.add('w-full', 'h-full');
        }
    }

    if (prev?.isConnected !== state.isConnected) {
        logoIcon.setAttribute(
            'class',
            state.isConnected
                ? 'w-6 h-6 text-white bg-gradient-to-r from-green-200 to-green-500 rounded-2xl p-1'
                : 'w-6 h-6 text-white bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-1'
        );
    }

    if (prev?.uploadedFiles !== state.uploadedFiles) {
        renderFileGrid(filesContainer, state.uploadedFiles);
    }

    splitPrevState = state;
}

// ── Widget mode (QrCodeGeneratorElement) ───────────────────────────────────

let widgetElement: QrCodeGeneratorElement | null = null;

function startWidgetMode(): void {
    widgetElement = new QrCodeGeneratorElement({
        ...SHARED_OPTIONS,
        container: widgetContainer,
        header: 'Upload files from mobile device',
        showHeader: true,
        showLogo: true,
        clickQrCodeToReload: true,
        filePreviewMode: 'grid',
        size: 'large'
    });
    widgetElement.start();
}

function stopWidgetMode(): void {
    widgetElement?.dispose();
    widgetElement = null;
}

// ── Tab switching ──────────────────────────────────────────────────────────

let activeTab: 'split' | 'widget' = 'split';

function switchTab(tab: 'split' | 'widget'): void {
    if (tab === activeTab) return;

    // Stop the current mode
    if (activeTab === 'split') stopSplitMode();
    else stopWidgetMode();

    activeTab = tab;

    // Update tab styles & panel visibility
    if (tab === 'split') {
        tabSplit.className = ACTIVE_TAB_CLASS;
        tabWidget.className = INACTIVE_TAB_CLASS;
        panelSplit.classList.remove('hidden');
        panelWidget.classList.add('hidden');
        startSplitMode();
    } else {
        tabSplit.className = INACTIVE_TAB_CLASS;
        tabWidget.className = ACTIVE_TAB_CLASS;
        panelSplit.classList.add('hidden');
        panelWidget.classList.remove('hidden');
        startWidgetMode();
    }
}

tabSplit.addEventListener('click', () => switchTab('split'));
tabWidget.addEventListener('click', () => switchTab('widget'));

// ── Boot ───────────────────────────────────────────────────────────────────

startSplitMode();
