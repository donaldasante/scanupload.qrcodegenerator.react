<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Upload } from 'lucide-vue-next';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import XHRUpload from '@uppy/xhr-upload';
import ScanUploadPlugin from '@scanupload/qr-code-generator-uppy';
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';
import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

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

// ── Widget controls ─────────────────────────────────────────────────────────

const showQrCodeLogo = ref(true);
const clickQrcodeReload = ref(true);
const showHeader = ref(true);
/**
 * Off by default: the button operates on the widget's file list, which is only
 * rendered when `showFilePreviews` is on. With previews off there is nothing
 * for it to act on, so it would sit there disabled.
 */
const showDownloadButton = ref(false);
/**
 * Off by default: Uppy renders everything the phone sends, so the widget's own
 * list would show the same files twice. Turn it on to exercise the widget's
 * preview list (and the two controls below it) instead.
 */
const showFilePreviews = ref(false);
const filePreviewMode = ref<'list' | 'grid'>('list');
const headerText = ref('Scan to upload');
const qrCodeSize = ref<'small' | 'medium' | 'large' | 'xlarge'>('large');

const sizeOptions = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' },
    { value: 'xlarge' as const, label: 'X-Large' }
];

// ── Uppy + ScanUpload wiring ────────────────────────────────────────────────

// The plugin owns the ScanUpload session and hands every file the phone sends
// to Uppy. The widget below renders the QR code for that same core, so both
// halves feed one Uppy instance and upload to the same place.
const core = shallowRef<QrCodeGeneratorCore | null>(null);
const dashboardHost = ref<HTMLDivElement | null>(null);
const uppyFileCount = ref(0);

/**
 * The QR square's rendered height, fed to the drop zone as `--scan-height` so
 * the two sit level. Measured rather than hard-coded because the size control
 * above drives it.
 *
 * This tracks the dashed QR square itself, not the whole widget — the drop zone
 * lines up with the code, not with the header above it or the reload hint below.
 */
const scanHost = ref<HTMLElement | null>(null);
const scanHeight = ref<number | null>(null);
/** How far the square sits below the top of the widget, in pixels. */
const scanOffset = ref(0);
let scanObserver: ResizeObserver | null = null;

function measureScan() {
    const host = scanHost.value;
    if (!host) return;

    // The widget renders the square a tick after the host appears, so re-query
    // on every pass instead of caching the element.
    const square = host.querySelector<HTMLElement>('.sqg-qr-wrapper') ?? host;
    const squareBox = square.getBoundingClientRect();

    scanHeight.value = Math.round(squareBox.height);
    // The scan half renders its widget header above the square, so the drop
    // zone is pushed down by the same amount to start on the square's line.
    scanOffset.value = Math.round(squareBox.top - host.getBoundingClientRect().top);
}

// The widget is behind a `v-if`, so it arrives after mount — watch the ref
// rather than observing once in `onMounted`, which would find `null`.
watch(scanHost, (el) => {
    scanObserver?.disconnect();
    scanObserver = null;
    if (!el) return;

    scanObserver = new ResizeObserver(measureScan);

    // Watching the host catches the square appearing inside it; watching the
    // square catches the size control changing it without the host moving.
    scanObserver.observe(el);
    const square = el.querySelector('.sqg-qr-wrapper');
    if (square) scanObserver.observe(square);

    measureScan();
});

let uppy: Uppy | null = null;

onMounted(() => {
    const instance = new Uppy({
        autoProceed: true,
        allowMultipleUploadBatches: true
    });

    // Everything the hub receives from the phone is added to Uppy here, through
    // the same `addFile()` path the drop zone below ends up using.
    instance.use(ScanUploadPlugin, { sessionUrl, clientId });

    // Where Uppy sends files from either source. Swap for @uppy/tus or
    // @uppy/aws-s3 without touching the ScanUpload plugin.
    instance.use(XHRUpload, {
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
    if (dashboardHost.value) {
        instance.use(Dashboard, {
            inline: true,
            target: dashboardHost.value,
            width: '100%',
            // Fill the host rather than a fixed size. Uppy writes this as an
            // inline style, so the host is what index.css controls — and the
            // host mirrors the QR widget's measured height, which lines the
            // drop zone up with it.
            height: '100%'
        });
    }

    const syncUppyFileCount = () => {
        uppyFileCount.value = instance.getFiles().length;
    };

    instance.on('file-added', syncUppyFileCount);
    instance.on('file-removed', syncUppyFileCount);
    instance.on('cancel-all', syncUppyFileCount);

    uppy = instance;

    const plugin = instance.getPlugin<ScanUploadPlugin>('ScanUpload');
    core.value = plugin?.getCore() ?? null;
});

onBeforeUnmount(() => {
    scanObserver?.disconnect();
    scanObserver = null;

    uppy?.destroy();
    uppy = null;
    core.value = null;
});
</script>

<template>
    <h2 class="demo-title">Example Form</h2>
    <div class="demo-card">
        <div class="mb-6">
            <div class="flex flex-col">
                <div class="checkbox-row">
                    <input
                        id="checkQrCodeLogo"
                        v-model="showQrCodeLogo"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkQrCodeLogo" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show Logo
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkClickReload"
                        v-model="clickQrcodeReload"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkClickReload" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Click QR code to reload
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkHeader"
                        v-model="showHeader"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkHeader" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show header
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkDownloadButton"
                        v-model="showDownloadButton"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkDownloadButton" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show download button
                    </label>
                </div>

                <div class="checkbox-row">
                    <input
                        id="checkFilePreviews"
                        v-model="showFilePreviews"
                        type="checkbox"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                    />
                    <label for="checkFilePreviews" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                        Show file previews
                    </label>
                </div>

                <div class="flex items-center mt-2">
                    <label for="headerText" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
                        Header text
                    </label>
                    <input
                        id="headerText"
                        v-model="headerText"
                        type="text"
                        class="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
                        placeholder="Enter header text"
                    />
                </div>

                <div class="flex flex-col gap-0 mt-2">
                    <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">File preview mode</div>
                    <div class="flex flex-row items-start mt-2 space-x-4">
                        <label class="flex items-center cursor-pointer group">
                            <input
                                v-model="filePreviewMode"
                                type="radio"
                                value="list"
                                name="file-preview-mode"
                                class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> List </span>
                        </label>
                        <label class="flex items-center cursor-pointer group">
                            <input
                                v-model="filePreviewMode"
                                type="radio"
                                value="grid"
                                name="file-preview-mode"
                                class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors"> Grid </span>
                        </label>
                    </div>
                </div>

                <div class="flex flex-col gap-0 mt-2">
                    <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">Qr Code size</div>
                    <div class="flex flex-row items-start mt-2 space-x-4">
                        <!-- items-start (not items-center) so the
                             radio stays aligned at the top of the
                             label, even when the label text wraps
                             to two lines like "Extra Large". -->
                        <label v-for="size in sizeOptions" :key="size.value" class="flex items-start cursor-pointer group">
                            <input
                                v-model="qrCodeSize"
                                type="radio"
                                :value="size.value"
                                name="qr-code-size"
                                class="h-4 w-4 mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                {{ size.label }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <section
        class="upload-box"
        :style="scanHeight === null ? undefined : { '--scan-height': `${scanHeight}px`, '--scan-offset': `${scanOffset}px` }"
    >
        <div class="half">
            <h2 class="half-title">From your phone</h2>
            <div v-if="core" ref="scanHost" class="scan-widget">
                <!--
                    `core` binds this widget to the plugin's session instead of
                    opening a second one, so this QR code is the one Uppy is listening to.
                -->
                <QrCodeGenerator
                    :session-url="sessionUrl"
                    :client-id="clientId"
                    :core="core"
                    :show-header="showHeader"
                    :header="headerText"
                    :size="qrCodeSize"
                    :show-logo="showQrCodeLogo"
                    :click-qr-code-to-reload="clickQrcodeReload"
                    :file-preview-mode="filePreviewMode"
                    :show-download-button="showDownloadButton"
                    :show-file-previews="showFilePreviews"
                />
            </div>
            <p v-else class="scan-pending">Connecting…</p>
        </div>

        <div class="half">
            <h2 class="half-title">From this device</h2>
            <div class="uppy-shell" :class="{ 'has-files': uppyFileCount > 0 }">
                <div ref="dashboardHost" class="uppy-host"></div>
                <Upload v-if="uppyFileCount === 0" class="drop-icon" :size="42" :stroke-width="1.25" aria-hidden="true" />
            </div>
        </div>
    </section>

    <p class="demo-back-link">
        <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline"> Back to ScanUpload </a>
    </p>
</template>
