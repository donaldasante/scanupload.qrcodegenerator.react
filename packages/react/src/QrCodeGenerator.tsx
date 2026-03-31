import React from "react";
import QRCode from "react-qr-code";
import Logo from "./components/Logo";
import { FaRedo } from "react-icons/fa";
import { DocumentPreviewer } from "./components/DocumentPreviewer";
import { FileList } from "./components/FileList";
import { cn } from "./utility/cn";
import { useQrCodeCore } from "./hooks/useQrCodeCore";

export interface QrCodeClassNames {
  /** Outer <section> wrapper */
  root?: string;
  /** Loading spinner overlay */
  loadingOverlay?: string;
  /** Error / retry overlay */
  errorOverlay?: string;
  /** Button inside the error overlay */
  errorButton?: string;
  /** Header <h1> element */
  header?: string;
  /** Bordered box that wraps the QR code */
  qrWrapper?: string;
  /** Reload button (shown when clickQrCodeToReload is false) */
  reloadButton?: string;
  /** "Click QR code to reload" hint text */
  hintText?: string;
  /** Container for the file grid / list */
  fileContainer?: string;
}

export interface QrCodeGeneratorProps {
  sessionUrl: string;
  refreshTokenUrl: string;
  showHeader?: boolean;
  header: string;
  showLogo?: boolean;
  clickQrCodeToReload?: boolean;
  filePreviewMode: "list" | "grid";
  size: "small" | "medium" | "large" | "xlarge";
  classNames?: QrCodeClassNames;
  style?: React.CSSProperties;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  sessionUrl,
  refreshTokenUrl,
  header,
  showHeader = false,
  showLogo = true,
  clickQrCodeToReload = false,
  size = "large",
  filePreviewMode = "grid",
  classNames = {},
  style,
}) => {
  const { state, retrySession } = useQrCodeCore({ sessionUrl, refreshTokenUrl });

  return (
    <section
      className={cn("sqg-root", classNames.root)}
      data-size={size}
      style={style}
    >
      {state.loading && (
        <div className={cn("sqg-overlay", classNames.loadingOverlay)}>
          <div className="sqg-loading-content">
            <div className="sqg-spinner" />
            <p className="sqg-loading-text">Loading...</p>
          </div>
        </div>
      )}
      {!state.loading && state.retry && (
        <div className={cn("sqg-overlay", classNames.errorOverlay)}>
          <div className="sqg-error-content">
            <p className="sqg-error-text">Cannot create session</p>
            <button
              onClick={async () => {
                await retrySession();
              }}
              className={cn("sqg-retry-btn", classNames.errorButton)}
            >
              <FaRedo />
            </button>
          </div>
        </div>
      )}
      <div className="sqg-content">
        {showHeader && (
          <header className="sqg-header">
            <h1 className={cn("sqg-header-title", classNames.header)}>
              {header}
            </h1>
          </header>
        )}
        <div
          aria-label="QR Code for file upload"
          onClick={async () => {
            if (clickQrCodeToReload) {
              await retrySession();
            }
          }}
          className={cn("sqg-qr-wrapper", classNames.qrWrapper)}
          style={clickQrCodeToReload ? { cursor: "pointer" } : undefined}
        >
          <div className="sqg-qr-inner">
            <QRCode
              value={state.deviceLoginUrl || "http://localhost"}
              size={200}
              className="sqg-qr-svg"
            />
            {showLogo && (
              <div className="sqg-logo-overlay">
                <Logo isConnected={state.isConnected} />
              </div>
            )}
          </div>
          <p className="sqg-sr-only">
            QR Code that allows uploads from {state.deviceLoginUrl}
          </p>
        </div>
        {!clickQrCodeToReload ? (
          <div className="sqg-reload-section">
            <button
              onClick={async () => {
                await retrySession();
              }}
              className={cn("sqg-reload-btn", classNames.reloadButton)}
            >
              <FaRedo /> <span>Reload</span>
            </button>
          </div>
        ) : (
          <div className="sqg-reload-section">
            <p className={cn("sqg-hint-text", classNames.hintText)}>
              Click QR code to reload
            </p>
          </div>
        )}
        <div className={cn("sqg-file-container", classNames.fileContainer)}>
          {filePreviewMode === "grid" ? (
            state.uploadedFiles.map((file, index) => (
              <DocumentPreviewer key={index} file={file} />
            ))
          ) : (
            <FileList files={state.uploadedFiles} />
          )}
        </div>
      </div>
    </section>
  );
};