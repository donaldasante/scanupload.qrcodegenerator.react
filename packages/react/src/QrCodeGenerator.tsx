import React from "react";
import QRCode from "react-qr-code";
import Logo from "./components/Logo";
import { FaRedo } from "react-icons/fa";
import { DocumentPreviewer } from "./components/DocumentPreviewer";
import { FileList } from "./components/FileList";
import { useQrCodeCore } from "./hooks/useQrCodeCore";

export interface QrCodeGeneratorProps {
  sessionUrl: string;
  refreshTokenUrl: string;
  showHeader?: boolean;
  header: string;
  showLogo?: boolean;
  clickQrCodeToReload?: boolean;
  filePreviewMode: "list" | "grid";
  size: "small" | "medium" | "large" | "xlarge";
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
}) => {
  const { state, retrySession } = useQrCodeCore({
    sessionUrl,
    refreshTokenUrl,
  });

  return (
    <section className="sqg-root" data-size={size}>
      {state.loading && (
        <div className="sqg-overlay">
          <div className="sqg-loading-content">
            <div className="sqg-spinner" />
            <p className="sqg-loading-text">Loading...</p>
          </div>
        </div>
      )}
      {!state.loading && state.retry && (
        <div className="sqg-overlay">
          <div className="sqg-error-content">
            <p className="sqg-error-text">Cannot create session</p>
            <button
              onClick={async () => {
                await retrySession();
              }}
              className="sqg-retry-btn"
            >
              <FaRedo />
            </button>
          </div>
        </div>
      )}
      <div className="sqg-content">
        {showHeader && (
          <header className="sqg-header">
            <h1 className="sqg-header-title">{header}</h1>
          </header>
        )}
        <div
          aria-label="QR Code for file upload"
          onClick={async () => {
            if (clickQrCodeToReload) {
              await retrySession();
            }
          }}
          className="sqg-qr-wrapper"
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
              className="sqg-reload-btn"
            >
              <FaRedo /> <span>Reload</span>
            </button>
          </div>
        ) : (
          <div className="sqg-reload-section">
            <p className="sqg-hint-text">Click QR code to reload</p>
          </div>
        )}
        <div className="sqg-file-container">
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
