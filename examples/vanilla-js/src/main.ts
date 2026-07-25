import { QrCodeGeneratorElement } from '@scanupload/qr-code-generator-vanilla';

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;

new QrCodeGeneratorElement({
    container: document.getElementById('widget-container')!,
    sessionUrl,
    clientId,
    header: 'Upload files from mobile device',
    showHeader: true,
    showLogo: true,
    clickQrCodeToReload: true,
    filePreviewMode: 'list',
    size: 'large',
    injectStyles: true,
    showDownloadButton: true
}).start();
