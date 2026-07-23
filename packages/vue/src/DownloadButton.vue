<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

const props = withDefaults(
    defineProps<{
        /** Core instance returned by {@link useQrCodeCore}. */
        core: QrCodeGeneratorCore;
        /** Label for the button. */
        label?: string;
    }>(),
    { label: 'Download' }
);

const downloading = ref(false);
const error = ref<string | null>(null);
const canDownload = ref(props.core.canDownloadZip());

let unsubscribe: (() => void) | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;

const updateCanDownload = () => {
    const next = props.core.canDownloadZip();
    // Clear stale errors when a new session becomes available.
    if (next && !canDownload.value) error.value = null;
    canDownload.value = next;
};

onMounted(() => {
    updateCanDownload();
    unsubscribe = props.core.subscribe(updateCanDownload);
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

async function handleClick() {
    setError(null);
    downloading.value = true;
    try {
        const result = await props.core.downloadSessionZip();
        if (result.ok) {
            triggerBrowserDownload(result.blob, result.filename);
        } else {
            setError(result.error);
        }
    } catch (err) {
        console.warn('DownloadButton error:', err);
        setError('Unexpected error — please try again.');
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
            :disabled="!canDownload || downloading"
            :aria-busy="downloading || undefined"
            @click="handleClick"
        >
            {{ downloading ? 'Downloading…' : label }}
        </button>
        <p v-if="error" class="sqg-download-error" role="alert">
            {{ error }}
        </p>
    </div>
</template>
