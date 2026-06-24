<script setup lang="ts">
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';
</script>

<template>
    <div class="demo-card">
        <h2 class="demo-title">Vue JS Demo</h2>
        <QrCodeGenerator
            session-url="/scanupload-api/session"
            refresh-token-url="/scanupload-api/token"
            :show-header="true"
            header="Upload files from mobile device"
            size="large"
            :show-logo="true"
            :click-qr-code-to-reload="true"
            file-preview-mode="grid"
        />
    </div>
</template>
