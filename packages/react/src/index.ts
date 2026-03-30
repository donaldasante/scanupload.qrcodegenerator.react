import './index.css';

// Component
export { QrCodeGenerator } from './QrCodeGenerator';
export type { QrCodeGeneratorProps, QrCodeClassNames } from './QrCodeGenerator';

// Hooks
export { useQrCodeCore } from './hooks/useQrCodeCore';
export { usePersistentState } from './hooks/usePersistentState';

// Re-export core types for convenience
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    StorageAdapter,
    QrCodeGeneratorCoreOptions
} from '@scanupload/qr-code-generator-core';
