// Core runtime
export { QrCodeGeneratorCore } from "./QrCodeGeneratorCore";
export type {
  QrCodeGeneratorCoreOptions,
  QrCodeGeneratorCoreSetOptions,
} from "./QrCodeGeneratorCore";

// Types
export type {
  SessionResponse,
  TokenResponse,
  UploadedFile,
  QrCodeGeneratorState,
} from "./types";

// Browser-only download helper (relies on DOM APIs).
export { triggerBrowserDownload } from "./download";

// Storage adapter
export type { StorageAdapter } from "./storage";
export { browserStorageAdapter } from "./storage";

// API client
export { postData, ApiError } from "./apiClient";

// Utilities
export { isNullOrEmpty } from "./utilities";
