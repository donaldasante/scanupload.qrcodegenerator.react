<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import { RotateCw } from 'lucide-vue-next';
import type { QrCodeGeneratorCore, ScanUploadFileOrigin, UploadedFile } from '@scanupload/qr-code-generator-core';
import Logo from './components/Logo.vue';
import DocumentPreviewer from './components/DocumentPreviewer.vue';
import FileList from './components/FileList.vue';
import DownloadButton from './DownloadButton.vue';
import { useQrCodeCore } from './composables/useQrCodeCore';

export interface QrCodeGeneratorProps {
    sessionUrl: string;
    /**
     * Optional client identifier (tenant / app GUID). Forwarded to the
     * session-create endpoint as `X-Client-Id` so the hub can scope
     * audit, rate-limits, and per-client rules.
     */
    clientId?: string;
    showHeader?: boolean;
    header?: string;
    showLogo?: boolean;
    clickQrCodeToReload?: boolean;
    filePreviewMode?: 'list' | 'grid';
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    /** Automatically replace an expired session. Default: false. */
    autoResession?: boolean;
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
     * Bind to an existing core instead of creating one, so this widget shares a
     * single ScanUpload session with whatever already owns that core — most
     * commonly the core exposed by the ScanUpload Uppy plugin.
     *
     * The injected core is configured and disposed by its owner, so
     * `sessionUrl`, `clientId` and `autoResession` are ignored while it is set.
     */
    core?: QrCodeGeneratorCore | null;
    /**
     * Called for every file the hub is holding for this session — including
     * files that were already there when this client connected.
     *
     * Useful for routing files somewhere other than this widget: an uploader, an
     * application-owned list, or analytics. Pair it with `showFilePreviews` set
     * to `false` to render them elsewhere. `origin` is `'restored'` when the file
     * was found during a reconnect resync rather than pushed live.
     */
    onFileAvailable?: (file: UploadedFile, origin: ScanUploadFileOrigin) => void;
    /** Called when the hub drops a single file. Not called for a full clear. */
    onFileRemoved?: (file: UploadedFile) => void;
    /** Called when every file is cleared at once: a session reset, or the session ending. */
    onFilesCleared?: (files: readonly UploadedFile[]) => void;
}

const props = withDefaults(defineProps<QrCodeGeneratorProps>(), {
    showHeader: false,
    header: '',
    showLogo: true,
    clickQrCodeToReload: false,
    filePreviewMode: 'grid',
    size: 'large',
    autoResession: false,
    showDownloadButton: false,
    showFilePreviews: true
});

const { state, retrySession, core } = useQrCodeCore({
    sessionUrl: () => props.sessionUrl,
    clientId: () => props.clientId,
    autoResession: () => props.autoResession,
    core: props.core,
    // Routed through `props` rather than captured once, so a parent that swaps
    // the handler later still reaches the live one.
    onFileAvailable: (file, origin) => props.onFileAvailable?.(file, origin),
    onFileRemoved: (file) => props.onFileRemoved?.(file),
    onFilesCleared: (files) => props.onFilesCleared?.(files)
});

const onQrClick = () => {
    if (props.clickQrCodeToReload) {
        void retrySession();
    }
};
</script>

<template>
    <section class="sqg-root" :data-size="size">
        <div v-if="state.loading" class="sqg-overlay">
            <div class="sqg-loading-content">
                <div class="sqg-spinner" />
                <p class="sqg-loading-text">Loading...</p>
            </div>
        </div>
        <div v-if="!state.loading && state.retry" class="sqg-overlay">
            <div class="sqg-error-content">
                <p class="sqg-error-text">Cannot create session</p>
                <button class="sqg-retry-btn" @click="() => void retrySession()">
                    <RotateCw :size="16" />
                </button>
            </div>
        </div>
        <div class="sqg-content">
            <header v-if="showHeader" class="sqg-header">
                <h1 class="sqg-header-title">{{ header }}</h1>
            </header>
            <div
                aria-label="QR Code for file upload"
                class="sqg-qr-wrapper"
                :style="clickQrCodeToReload ? { cursor: 'pointer' } : undefined"
                @click="onQrClick"
            >
                <div class="sqg-qr-inner">
                    <QrcodeVue :value="state.deviceLoginUrl || 'http://localhost'" :size="200" render-as="svg" class="sqg-qr-svg" />
                    <div v-if="showLogo" class="sqg-logo-overlay">
                        <Logo :is-connected="state.isConnected" />
                    </div>
                </div>
                <p class="sqg-sr-only">QR Code that allows uploads from {{ state.deviceLoginUrl }}</p>
            </div>
            <div v-if="!clickQrCodeToReload" class="sqg-reload-section">
                <button class="sqg-reload-btn" @click="() => void retrySession()"><RotateCw :size="16" /> <span>Reload</span></button>
            </div>
            <div v-else class="sqg-reload-section">
                <p class="sqg-hint-text">Click QR code to reload</p>
            </div>
            <div v-if="showFilePreviews" class="sqg-file-container">
                <template v-if="filePreviewMode === 'grid'">
                    <DocumentPreviewer v-for="(file, index) in state.uploadedFiles" :key="index" :file="file" />
                </template>
                <FileList v-else :files="state.uploadedFiles" />
            </div>
            <DownloadButton v-if="showDownloadButton" :core="core" />
        </div>
    </section>
</template>
