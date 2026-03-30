export { QrCodeController } from './QrCodeController';
export type { QrCodeControllerOptions } from './QrCodeController';

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
