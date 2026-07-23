<script lang="ts">
    import { QrCodeGenerator } from '@scanupload/qr-code-generator-svelte';

    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    const sessionUrl = import.meta.env.VITE_SESSION_URL;
    const downloadUrl = import.meta.env.VITE_DOWNLOAD_URL;
    const clientId = import.meta.env.VITE_CLIENT_ID;
</script>

<div class="demo-card">
    <h2 class="demo-title">Svelte Demo</h2>
    <QrCodeGenerator
        sessionUrl={sessionUrl}
        downloadUrl={downloadUrl}
        clientId={clientId}
        showHeader={true}
        header="Upload files from mobile device"
        size="large"
        showLogo={true}
        clickQrCodeToReload={true}
        filePreviewMode="grid"
    />
</div>
