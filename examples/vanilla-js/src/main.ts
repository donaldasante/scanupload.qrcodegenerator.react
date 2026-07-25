import { QrCodeGeneratorElement } from '@scanupload/qr-code-generator-vanilla';
import './index.css';

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;

const widget = new QrCodeGeneratorElement({
    container: document.getElementById('widget-container')!,
    sessionUrl,
    clientId,
    showHeader: true,
    header: 'Scan to upload',
    showLogo: true,
    clickQrCodeToReload: true,
    filePreviewMode: 'list',
    size: 'large',
    injectStyles: true,
    showDownloadButton: true,
});
widget.start();

// Wire up the settings panel. Each control calls `setOptions` on the
// underlying element, which mutates the live widget in place (no remount).
type FilePreviewMode = 'list' | 'grid';
type QrCodeSize = 'small' | 'medium' | 'large' | 'xlarge';

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T | null;

const headerText = $<HTMLInputElement>('headerText');
headerText?.addEventListener('input', () => {
    void widget.setOptions({ header: headerText.value });
});

$<HTMLInputElement>('checkQrCodeLogo')?.addEventListener('change', (e) => {
    void widget.setOptions({ showLogo: (e.target as HTMLInputElement).checked });
});

$<HTMLInputElement>('checkClickReload')?.addEventListener('change', (e) => {
    void widget.setOptions({
        clickQrCodeToReload: (e.target as HTMLInputElement).checked,
    });
});

$<HTMLInputElement>('checkHeader')?.addEventListener('change', (e) => {
    void widget.setOptions({ showHeader: (e.target as HTMLInputElement).checked });
});

$<HTMLInputElement>('checkDownloadButton')?.addEventListener('change', (e) => {
    void widget.setOptions({
        showDownloadButton: (e.target as HTMLInputElement).checked,
    });
});

document
    .querySelectorAll<HTMLInputElement>('input[name="file-preview-mode"]')
    .forEach((el) =>
        el.addEventListener('change', () => {
            if (el.checked) {
                void widget.setOptions({ filePreviewMode: el.value as FilePreviewMode });
            }
        }),
    );

document
    .querySelectorAll<HTMLInputElement>('input[name="qr-code-size"]')
    .forEach((el) =>
        el.addEventListener('change', () => {
            if (el.checked) {
                void widget.setOptions({ size: el.value as QrCodeSize });
            }
        }),
    );
