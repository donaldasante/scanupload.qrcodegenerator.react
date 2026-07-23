<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import { RotateCw } from 'lucide-vue-next';
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
    /**
     * Optional endpoint that streams all uploaded files for a session as a
     * ZIP archive. UIs use this to render a "Download" CTA that targets
     * `GET <downloadUrl>?session_id=<id>`. Auth is enforced by the hub.
     */
    downloadUrl?: string;
    showHeader?: boolean;
    header?: string;
    showLogo?: boolean;
    clickQrCodeToReload?: boolean;
    filePreviewMode?: 'list' | 'grid';
    size?: 'small' | 'medium' | 'large' | 'xlarge';
}

const props = withDefaults(defineProps<QrCodeGeneratorProps>(), {
    showHeader: false,
    header: '',
    showLogo: true,
    clickQrCodeToReload: false,
    filePreviewMode: 'grid',
    size: 'large'
});

const { state, retrySession, core } = useQrCodeCore({
    sessionUrl: () => props.sessionUrl,
    clientId: () => props.clientId,
    downloadUrl: () => props.downloadUrl
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
            <div class="sqg-file-container">
                <template v-if="filePreviewMode === 'grid'">
                    <DocumentPreviewer v-for="(file, index) in state.uploadedFiles" :key="index" :file="file" />
                </template>
                <FileList v-else :files="state.uploadedFiles" />
            </div>
            <DownloadButton v-if="downloadUrl" :core="core" />
        </div>
    </section>
</template>
