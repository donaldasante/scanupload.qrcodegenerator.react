import "./index.css";

// Component
export { QrCodeGenerator } from "./QrCodeGenerator";
export type { QrCodeGeneratorProps } from "./QrCodeGenerator";
export { DownloadButton } from "./DownloadButton";
export type { DownloadButtonProps } from "./DownloadButton";

// Hooks
export { useQrCodeCore } from "./hooks/useQrCodeCore";

// Re-export core types for convenience
export type {
  SessionResponse,
  TokenResponse,
  UploadedFile,
  QrCodeGeneratorState,
  StorageAdapter,
  QrCodeGeneratorCoreOptions,
} from "@scanupload/qr-code-generator-core";
