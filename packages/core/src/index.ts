// Core runtime
export { QrCodeGeneratorCore } from './QrCodeGeneratorCore';
export type { QrCodeGeneratorCoreOptions, QrCodeGeneratorCoreSetOptions } from './QrCodeGeneratorCore';

// Types
export type {
    SessionResponse,
    TokenResponse,
    UploadedFile,
    QrCodeGeneratorState,
    ScanUploadFileOrigin,
    ScanUploadEventMap,
    ScanUploadEventName,
    ScanUploadEventListener,
    ScanUploadUnsubscribe,
    ScanUploadFileSink,
    ScanUploadFileContext,
    ScanUploadClearedEntry,
    ScanUploadFilesConnection
} from './types';

// File materialization (browser-only: downloads a hub file into a real `File`).
export {
    toFile,
    materializeFile,
    MissingFileUrlError,
    resolveFileIdentity,
    deriveFilename,
    isRetryableStatus,
    backoffDelayMs,
    isAbortError,
    toError,
    delay,
    DEFAULT_MAX_DOWNLOAD_ATTEMPTS,
    DEFAULT_DOWNLOAD_RETRY_DELAY_MS,
    MAX_DOWNLOAD_RETRY_DELAY_MS
} from './toFile';
export type { ToFileOptions, ToFileRetryInfo, ToFileBuilder, UploadedFileUrlResolver, MaterializedFile } from './toFile';

// Vendor-neutral fan-out to any file-accepting target.
export { connectScanUploadFiles } from './fileBridge';
export type { ConnectScanUploadFilesOptions } from './fileBridge';

// Browser-only download helper (relies on DOM APIs).
export { triggerBrowserDownload } from './download';

// Storage adapter
export type { StorageAdapter } from './storage';
export { browserStorageAdapter } from './storage';

// API client
export { postData, ApiError } from './apiClient';

// Utilities
export { isNullOrEmpty } from './utilities';
