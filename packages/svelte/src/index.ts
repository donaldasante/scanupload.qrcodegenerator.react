import './index.css';

// Component
export { default as QrCodeGenerator } from './QrCodeGenerator.svelte';
export type { QrCodeGeneratorProps } from './QrCodeGenerator.svelte';
export { default as DownloadButton } from './DownloadButton.svelte';
export { default as Logo } from './components/Logo.svelte';
export { default as ProgressBar } from './components/ProgressBar.svelte';
export { default as FileList } from './components/FileList.svelte';
export { default as DocumentPreviewer } from './components/DocumentPreviewer.svelte';

// Store-based controller
export { createQrCodeController } from './useQrCodeCore';
export type { QrCodeController, UseQrCodeCoreOptions } from './useQrCodeCore';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';
