import './index.css';

// Components
export { QrCodeGeneratorComponent } from './qr-code-generator.component';
export type { FilePreviewMode, QrCodeSize } from './qr-code-generator.component';
export { LogoComponent } from './components/logo.component';
export { ProgressBarComponent } from './components/progress-bar.component';
export { FileListComponent } from './components/file-list.component';
export { DocumentPreviewerComponent } from './components/document-previewer.component';
export { DownloadButtonComponent } from './components/download-button.component';

// Controller (signal-based core wrapper)
export { useQrCodeCore } from './use-qr-code-core';
export type { QrCodeCoreController, UseQrCodeCoreOptions } from './use-qr-code-core';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';
