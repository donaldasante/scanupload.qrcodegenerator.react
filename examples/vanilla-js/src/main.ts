import { QrCodeGeneratorElement } from '@scanupload/qr-code-generator-vanilla';
// When overriding styles, import the base CSS then your overrides,
// and set injectStyles: false so the built-in injection doesn't run first.
//import '@scanupload/qr-code-generator-vanilla/dist/index.css';
//import './override.css';

new QrCodeGeneratorElement({
    container: document.getElementById('widget-container')!,
    sessionUrl: '/scanupload-api/session',
    refreshTokenUrl: '/scanupload-api/token',
    header: 'Upload files from mobile device',
    showHeader: true,
    showLogo: true,
    clickQrCodeToReload: true,
    filePreviewMode: 'list',
    size: 'large',
    injectStyles: true
}).start();
