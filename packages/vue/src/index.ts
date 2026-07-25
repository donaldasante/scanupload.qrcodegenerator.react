import './index.css';

// Component
export { default as QrCodeGenerator } from './QrCodeGenerator.vue';
export type { QrCodeGeneratorProps } from './QrCodeGenerator.vue';
export { default as DownloadButton } from './DownloadButton.vue';

// Composables
export { useQrCodeCore } from './composables/useQrCodeCore';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';
