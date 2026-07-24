<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore, UploadedFile } from '@scanupload/qr-code-generator-core';

const props = withDefaults(
    defineProps<{
        /** Core instance returned by {@link useQrCodeCore}. */
        core: QrCodeGeneratorCore;
        /** Label for the button. Default: "Download all files". */
        label?: string;
    }>(),
    { label: 'Download all files' }
);

const downloading = ref(false);
const error = ref<string | null>(null);
const fileCount = ref(0);

let unsubscribe: (() => void) | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;

function countDownloadable(files: readonly UploadedFile[]): number {
    return files.reduce((n, f) => (f.url ? n + 1 : n), 0);
}

function updateFileCount() {
    fileCount.value = countDownloadable(props.core.getState().uploadedFiles);
}

onMounted(() => {
    updateFileCount();
    unsubscribe = props.core.subscribe(updateFileCount);
});

onBeforeUnmount(() => {
    unsubscribe?.();
    unsubscribe = null;
    if (errorTimer) clearTimeout(errorTimer);
});

function setError(msg: string | null) {
    error.value = msg;
    if (errorTimer) { clearTimeout(errorTimer); errorTimer = null; }
    if (msg) {
        errorTimer = setTimeout(() => { error.value = null; errorTimer = null; }, 5000);
    }
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

async function handleClick() {
    setError(null);
    const files = props.core.getState().uploadedFiles.filter((f) => Boolean(f.url));
    if (files.length === 0) return;

    downloading.value = true;
    try {
        const results = await Promise.allSettled(files.map(downloadFile));
        const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
            const firstReason = failed[0].reason;
            const message = firstReason instanceof Error
                ? firstReason.message
                : 'Some files failed to download.';
            setError(failed.length === files.length
                ? `All downloads failed. ${message}`
                : `${failed.length} of ${files.length} files failed. ${message}`);
        }
    } finally {
        downloading.value = false;
    }
}
</script>

<template>
    <div class="sqg-download">
        <button
            type="button"
            class="sqg-download-btn"
            :disabled="downloading || fileCount === 0"
            :aria-busy="downloading || undefined"
            @click="handleClick"
        >
            {{ downloading
                ? 'Downloading…'
                : fileCount > 0
                    ? `${label} (${fileCount})`
                    : label }}
        </button>
        <p v-if="error" class="sqg-download-error" role="alert">
            {{ error }}
        </p>
    </div>
</template>
