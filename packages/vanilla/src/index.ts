// Headless controller
export { QrCodeController } from './QrCodeController';
export type { QrCodeControllerOptions } from './QrCodeController';

// DOM-based UI element (full visual component)
export { QrCodeGeneratorElement } from './QrCodeGeneratorElement';
export type { QrCodeGeneratorElementOptions } from './QrCodeGeneratorElement';

// QR code SVG generation
export { generateQrSvg } from './qrcode';

// File icon helpers
export { getFileIconSvg, getGenericDocIconSvg } from './fileIcons';

// DOM utilities
export { el, escapeHtml, getFileExtension } from './domUtils';

// SVG icon constants
export { REDO_SVG, QR_SCANNER_SVG } from './icons';

// Shared renderers
export { renderFileGrid, renderFileList, createProgressBar } from './renderers';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';

export { QrCodeGeneratorCore, browserStorageAdapter } from '@scanupload/qr-code-generator-core';
