import { QrCodeGeneratorElement } from '@scanupload/qr-code-generator-vanilla';
// When overriding styles, import the base CSS then your overrides,
// and set injectStyles: false so the built-in injection doesn't run first.
//import '@scanupload/qr-code-generator-vanilla/dist/index.css';
//import './override.css';

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const downloadUrl = import.meta.env.VITE_DOWNLOAD_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;

new QrCodeGeneratorElement({
    container: document.getElementById('widget-container')!,
    sessionUrl,
    downloadUrl,
    clientId,
    header: 'Upload files from mobile device',
    showHeader: true,
    showLogo: true,
    clickQrCodeToReload: true,
    filePreviewMode: 'list',
    size: 'large',
    injectStyles: true
}).start();
