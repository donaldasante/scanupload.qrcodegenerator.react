import './index.css';

// Component
export { default as QrCodeGenerator } from './QrCodeGenerator.vue';
export type { QrCodeGeneratorProps } from './QrCodeGenerator.vue';

// Composables
export { useQrCodeCore } from './composables/useQrCodeCore';
export { usePersistentState } from './composables/usePersistentState';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';
