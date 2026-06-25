<script lang="ts">
    import { QrCodeGenerator } from '@scanupload/qr-code-generator-svelte';
</script>

<div class="demo-card">
    <h2 class="demo-title">Svelte Demo</h2>
    <QrCodeGenerator
        sessionUrl="/scanupload-api/session"
        refreshTokenUrl="/scanupload-api/token"
        showHeader={true}
        header="Upload files from mobile device"
        size="large"
        showLogo={true}
        clickQrCodeToReload={true}
        filePreviewMode="grid"
    />
</div>
