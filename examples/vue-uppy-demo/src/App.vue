<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { Download } from 'lucide-vue-next';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import XHRUpload from '@uppy/xhr-upload';
import ScanUploadPlugin from '@scanupload/qr-code-generator-uppy';
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';
import type { QrCodeGeneratorCore, QrCodeGeneratorState } from '@scanupload/qr-code-generator-core';

// ── Configuration ───────────────────────────────────────────────────────────

function requiredEnv(value: string | undefined, name: string): string {
    if (!value) {
        throw new Error(`${name} is not set. Copy .env.example to .env.local and fill it in.`);
    }
    return value;
}

const sessionUrl = requiredEnv(import.meta.env.VITE_SESSION_URL, 'VITE_SESSION_URL');
const clientId = requiredEnv(import.meta.env.VITE_CLIENT_ID, 'VITE_CLIENT_ID');
const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/demo-upload';

// ── Wiring ──────────────────────────────────────────────────────────────────

// The plugin owns the ScanUpload session. The widget renders the QR code for
// that same core, so both halves of the box feed one Uppy instance.
const core = shallowRef<QrCodeGeneratorCore | null>(null);
const scanState = ref<QrCodeGeneratorState | null>(null);
const dashboardHost = ref<HTMLDivElement | null>(null);
const uppyFileCount = ref(0);
const uploadedCount = ref(0);

let uppy: Uppy | null = null;
let unsubscribeCore: (() => void) | null = null;

const isConnected = computed(() => scanState.value?.isConnected ?? false);
const receivedCount = computed(() => scanState.value?.uploadedFiles.length ?? 0);

onMounted(() => {
    const instance = new Uppy({
        autoProceed: true,
        allowMultipleUploadBatches: true
    });

    // Everything the hub receives from the phone is added to Uppy here, through
    // the same `addFile()` path the drop zone in the other half ends up using.
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

    // The Dashboard is the "normal drop files" half. The plugin is headless, so
    // Uppy works without it too.
    if (dashboardHost.value) {
        instance.use(Dashboard, {
            inline: true,
            target: dashboardHost.value,
            width: '100%',
            // CSS-valued dimensions remain responsive after mount. Dashboard's
            // ResizeObserver updates its own compact layout as this changes.
            height: 'clamp(13.5rem, 28svh, 15rem)'
        });
    }

    const syncUppyFileCount = () => {
        uppyFileCount.value = instance.getFiles().length;
    };

    instance.on('file-added', syncUppyFileCount);
    instance.on('file-removed', syncUppyFileCount);
    instance.on('cancel-all', syncUppyFileCount);
    instance.on('upload-success', () => {
        uploadedCount.value += 1;
    });

    uppy = instance;

    const plugin = instance.getPlugin<ScanUploadPlugin>('ScanUpload');
    const boundCore = plugin?.getCore() ?? null;
    core.value = boundCore;

    if (boundCore) {
        scanState.value = boundCore.getState();
        unsubscribeCore = boundCore.subscribe(() => {
            scanState.value = boundCore.getState();
        });
    }
});

onBeforeUnmount(() => {
    unsubscribeCore?.();
    unsubscribeCore = null;

    uppy?.destroy();
    uppy = null;
    core.value = null;
    scanState.value = null;
});
</script>

<template>
    <main class="page">
        <h1 class="page-title">ScanUpload × Uppy</h1>
        <p class="page-subtitle">
            Send a file from your phone by scanning the code, or drop one in the other half. Both end up in the same Uppy instance and are
            uploaded to the same place.
        </p>

        <section class="upload-box">
            <div class="half half--scan">
                <h2 class="half-title">From your phone</h2>
                <div v-if="core" class="scan-widget">
                    <!--
                        `show-file-previews` is off because Uppy renders the received
                        files in the other half, and `core` binds this widget to the
                        plugin's session instead of opening a second one.
                    -->
                    <QrCodeGenerator
                        :session-url="sessionUrl"
                        :client-id="clientId"
                        :core="core"
                        :show-file-previews="false"
                        size="large"
                    />
                </div>
                <p v-else class="scan-pending">Connecting…</p>
            </div>

            <div class="half">
                <h2 class="half-title">From this device</h2>
                <div class="uppy-shell">
                    <div ref="dashboardHost" class="uppy-host"></div>
                    <Download v-if="uppyFileCount === 0" class="drop-icon" :size="42" :stroke-width="1.25" aria-hidden="true" />
                </div>
            </div>
        </section>

        <div class="status" aria-live="polite">
            <span class="status-item">
                <span class="status-dot" :class="isConnected ? 'status-dot--on' : 'status-dot--off'"></span>
                {{ isConnected ? 'Phone connected' : 'Phone offline' }}
            </span>
            <span class="status-item"
                ><strong>{{ receivedCount }}</strong> from phone</span
            >
            <span class="status-item"
                ><strong>{{ uploadedCount }}</strong> uploaded</span
            >
        </div>
    </main>
</template>
