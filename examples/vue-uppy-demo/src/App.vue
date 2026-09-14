<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
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

// ── Demo state ──────────────────────────────────────────────────────────────

interface LogEntry {
    id: number;
    time: string;
    kind: 'event' | 'forwarded' | 'info' | 'error';
    message: string;
}

const core = shallowRef<QrCodeGeneratorCore | null>(null);
const scanState = ref<QrCodeGeneratorState | null>(null);
const dashboardHost = ref<HTMLDivElement | null>(null);
const log = ref<LogEntry[]>([]);

const autoProceed = ref(true);
const shareCore = ref(true);
const pluginReady = ref(false);
const forwardedCount = ref(0);
const uploadedCount = ref(0);

let uppy: Uppy | null = null;
let plugin: ScanUploadPlugin | null = null;
let unsubscribeCore: (() => void) | null = null;
let nextLogId = 1;

function addLog(kind: LogEntry['kind'], message: string): void {
    log.value = [{ id: nextLogId++, time: new Date().toLocaleTimeString(), kind, message }, ...log.value].slice(0, 100);
}

const isConnected = computed(() => scanState.value?.isConnected ?? false);
const receivedCount = computed(() => scanState.value?.uploadedFiles.length ?? 0);
const secondsRemaining = computed(() => scanState.value?.secondsRemaining ?? null);

/**
 * The widget only renders once the shared core exists — otherwise it would
 * mount with `core: null`, create a second session, and the plugin would never
 * see the files uploaded from that QR code.
 */
const widgetReady = computed(() => !shareCore.value || core.value !== null);
const widgetKey = computed(() => (shareCore.value ? 'shared' : 'own'));
const widgetCore = computed(() => (shareCore.value ? core.value : null));

/** Bind to the core owned by the plugin and mirror its state into Vue refs. */
function bindCore(next: QrCodeGeneratorCore | null): void {
    unsubscribeCore?.();
    unsubscribeCore = null;

    core.value = next;
    scanState.value = next?.getState() ?? null;

    if (next) {
        unsubscribeCore = next.subscribe(() => {
            scanState.value = next.getState();
        });
    }
}

// ── Wiring ──────────────────────────────────────────────────────────────────

onMounted(() => {
    const instance = new Uppy({
        autoProceed: autoProceed.value,
        allowMultipleUploadBatches: true
    });

    // 1. The ScanUpload plugin: watches the session and hands every file that
    //    arrives from the phone to Uppy through `uppy.addFile()`.
    instance.use(ScanUploadPlugin, {
        sessionUrl,
        clientId,
        onForwarded: (file, uppyFileId) => {
            forwardedCount.value += 1;
            addLog('forwarded', `${file.name} → Uppy file ${uppyFileId}`);
        },
        onForwardError: (error, file) => {
            addLog('error', `${file.name}: ${error.message}`);
        },
        // The hub publishes a file's URL slightly before the blob is readable,
        // so the first GET normally 404s and the retry succeeds. Surfacing it
        // keeps that transient 404 from looking like a real failure.
        onDownloadRetry: ({ attempt, maxAttempts }, file) => {
            addLog('info', `retry ${attempt + 1}/${maxAttempts} · ${file.name} · hub was not ready yet`);
        }
    });

    // 2. The uploader. Swap for @uppy/tus or @uppy/aws-s3 without touching the
    //    ScanUpload plugin — it only ever deals with Uppy's file state.
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

    // 3. Optional UI. The plugin is headless, so Uppy works without a Dashboard.
    if (dashboardHost.value) {
        instance.use(Dashboard, {
            inline: true,
            target: dashboardHost.value,
            height: 340,
            note: 'Files scanned from your phone land here automatically.'
        });
    }

    instance.on('file-added', (file) => addLog('event', `file-added · ${file.name}`));
    instance.on('upload-success', (file, response) => {
        uploadedCount.value += 1;
        addLog('event', `upload-success · ${file?.name} → ${response?.uploadURL ?? 'ok'}`);
    });
    instance.on('upload-error', (file, error) => {
        addLog('error', `upload-error · ${file?.name}: ${error?.message ?? String(error)}`);
    });
    instance.on('complete', (result) => {
        addLog('info', `complete · ${result?.successful?.length ?? 0} uploaded, ${result?.failed?.length ?? 0} failed`);
    });
    instance.on('cancel-all', () => addLog('info', 'cancel-all'));

    uppy = instance;
    plugin = instance.getPlugin<ScanUploadPlugin>('ScanUpload') ?? null;
    pluginReady.value = plugin !== null;
    bindCore(plugin?.getCore() ?? null);

    addLog('info', `Uppy ready · uploading to ${uploadEndpoint}`);
});

onBeforeUnmount(() => {
    unsubscribeCore?.();
    unsubscribeCore = null;

    uppy?.destroy();
    uppy = null;
    plugin = null;
    pluginReady.value = false;
    bindCore(null);
});

// ── Controls ────────────────────────────────────────────────────────────────

function toggleAutoProceed(): void {
    uppy?.setOptions({ autoProceed: autoProceed.value });
    addLog('info', `autoProceed → ${autoProceed.value}`);
}

function newSession(): void {
    void plugin?.retrySession();
    addLog('info', 'plugin.retrySession()');
}

function retryFailed(): void {
    plugin?.retryFailed();
    addLog('info', 'plugin.retryFailed()');
}

function clearUppy(): void {
    uppy?.clear();
    uploadedCount.value = 0;
    forwardedCount.value = 0;
    addLog('info', 'uppy.clear()');
}
</script>

<template>
    <header class="page-header">
        <h1 class="page-title">ScanUpload × Uppy</h1>
        <p class="page-subtitle">
            Scan the QR code with your phone and upload a photo. The
            <code>@scanupload/qr-code-generator-uppy</code> plugin downloads it in the browser and adds it to Uppy, which then uploads it to
            <code>{{ uploadEndpoint }}</code
            >.
        </p>
    </header>

    <main class="layout">
        <section class="panel">
            <h2 class="panel-title">1 · ScanUpload session</h2>

            <div class="endpoints">
                <span
                    >hub <code>{{ sessionUrl }}</code></span
                >
                <span
                    >upload <code>{{ uploadEndpoint }}</code></span
                >
            </div>

            <div v-if="widgetReady" class="scan-widget">
                <QrCodeGenerator
                    :key="widgetKey"
                    :session-url="sessionUrl"
                    :client-id="clientId"
                    :core="widgetCore"
                    :show-header="true"
                    header="Scan to upload"
                    file-preview-mode="list"
                    size="large"
                />
            </div>
            <div v-else class="scan-widget scan-widget--pending">Connecting to the hub…</div>

            <div class="status-grid">
                <div class="status-cell">
                    <div class="status-label">SignalR</div>
                    <div class="status-value" :class="isConnected ? 'is-on' : 'is-off'">
                        {{ isConnected ? 'connected' : 'offline' }}
                    </div>
                </div>
                <div class="status-cell">
                    <div class="status-label">Received</div>
                    <div class="status-value">{{ receivedCount }}</div>
                </div>
                <div class="status-cell">
                    <div class="status-label">Session TTL</div>
                    <div class="status-value">{{ secondsRemaining ?? '—' }}<span v-if="secondsRemaining !== null">s</span></div>
                </div>
            </div>

            <div class="controls">
                <button class="control-btn" type="button" :disabled="!pluginReady" @click="newSession">New session</button>
                <button class="control-btn" type="button" :disabled="!pluginReady" @click="retryFailed">Retry failed downloads</button>
            </div>

            <label class="option-row">
                <input v-model="shareCore" type="checkbox" />
                <span>
                    Share the plugin's core with the widget
                    <span class="option-hint">
                        off → the widget opens its own session, showing a second QR code whose uploads the plugin never sees.
                    </span>
                </span>
            </label>

            <details v-if="receivedCount > 0" class="hub-files" open>
                <summary>Hub files ({{ receivedCount }})</summary>
                <ul>
                    <li v-for="file in scanState?.uploadedFiles ?? []" :key="file.id">
                        <span class="hub-file-name">{{ file.name }}</span>
                        <a class="hub-file-url" :href="file.url ?? '#'" target="_blank" rel="noreferrer">
                            {{ file.url ?? '(no url published)' }}
                        </a>
                    </li>
                </ul>
            </details>
        </section>

        <section class="panel">
            <h2 class="panel-title">2 · Uppy</h2>

            <div ref="dashboardHost" class="uppy-host"></div>

            <div class="controls">
                <label class="option-row option-row--inline">
                    <input v-model="autoProceed" type="checkbox" @change="toggleAutoProceed" />
                    <span>autoProceed</span>
                </label>
                <button class="control-btn" type="button" @click="clearUppy">Clear Uppy</button>
            </div>

            <div class="status-grid">
                <div class="status-cell">
                    <div class="status-label">Forwarded</div>
                    <div class="status-value">{{ forwardedCount }}</div>
                </div>
                <div class="status-cell">
                    <div class="status-label">Uploaded</div>
                    <div class="status-value">{{ uploadedCount }}</div>
                </div>
                <div class="status-cell">
                    <div class="status-label">Session id</div>
                    <div class="status-value status-value--small">{{ scanState?.sessionId ?? '—' }}</div>
                </div>
            </div>

            <ul class="log">
                <li v-for="entry in log" :key="entry.id" class="log-entry">
                    <span class="log-time">{{ entry.time }}</span>
                    <span class="log-kind" :class="`log-kind--${entry.kind}`">{{ entry.kind }}</span>
                    <span class="log-message">{{ entry.message }}</span>
                </li>
            </ul>
        </section>
    </main>
</template>
