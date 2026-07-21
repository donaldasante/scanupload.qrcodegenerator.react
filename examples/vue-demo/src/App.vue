<script setup lang="ts">
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;
</script>

<template>
    <div class="demo-card">
        <h2 class="demo-title">Vue JS Demo</h2>
        <QrCodeGenerator
            :session-url="sessionUrl"
            :client-id="clientId"
            :show-header="true"
            header="Upload files from mobile device"
            size="large"
            :show-logo="true"
            :click-qr-code-to-reload="true"
            file-preview-mode="grid"
        />
    </div>
</template>
