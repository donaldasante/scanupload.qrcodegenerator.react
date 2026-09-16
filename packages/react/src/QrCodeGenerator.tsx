import React from "react";
import QRCode from "react-qr-code";
import Logo from "./components/Logo";
import { FaRedo } from "react-icons/fa";
import { DocumentPreviewer } from "./components/DocumentPreviewer";
import { FileList } from "./components/FileList";
import { useQrCodeCore } from "./hooks/useQrCodeCore";
import { DownloadButton } from "./DownloadButton";
import type { QrCodeGeneratorCore, ScanUploadFileOrigin, UploadedFile } from "@scanupload/qr-code-generator-core";

export interface QrCodeGeneratorProps {
  sessionUrl: string;
  /**
   * Optional client identifier (tenant / app GUID). Forwarded to the
   * session-create endpoint as `X-Client-Id` so the hub can scope
   * audit, rate-limits, and per-client rules.
   */
  clientId?: string;
  showHeader?: boolean;
  header: string;
  showLogo?: boolean;
  clickQrCodeToReload?: boolean;
  filePreviewMode: "list" | "grid";
  size: "small" | "medium" | "large" | "xlarge";
  /**
   * Create a fresh session automatically when the current one expires.
   * Default: false, so the disconnected logo and Reload action remain visible.
   */
  autoResession?: boolean;
  /**
   * Show a "Download all files" button beneath the file previews. When
   * clicked, it fetches every `UploadedFile.url` the SignalR hub has
   * surfaced and triggers a browser save for each. Default: false.
   */
  showDownloadButton?: boolean;
  /**
   * Render the list of files received from the phone inside the widget.
   *
   * Set to `false` when something else already renders them — most commonly an
   * Uppy Dashboard fed by `@scanupload/qr-code-generator-uppy` — so the same
   * files are not shown twice. `filePreviewMode` and `showDownloadButton` are
   * independent of this. Default: `true`.
   */
  showFilePreviews?: boolean;
  /**
   * Bind to an existing core instead of creating one, so this widget shares a
   * single ScanUpload session with whatever already owns that core — most
   * commonly the core exposed by the ScanUpload Uppy plugin.
   *
   * The injected core is configured and disposed by its owner, so
   * `sessionUrl`, `clientId` and `autoResession` are ignored while it is set.
   */
  core?: QrCodeGeneratorCore | null;
  /**
   * Called for every file the hub is holding for this session — including
   * files that were already there when this client connected.
   *
   * Useful for routing files somewhere other than this widget: an uploader, an
   * application-owned list, or analytics. Pair it with `showFilePreviews={false}`
   * to render them elsewhere. `origin` is `'restored'` when the file was found
   * during a reconnect resync rather than pushed live.
   */
  onFileAvailable?: (file: UploadedFile, origin: ScanUploadFileOrigin) => void;
  /** Called when the hub drops a single file. Not called for a full clear. */
  onFileRemoved?: (file: UploadedFile) => void;
  /** Called when every file is cleared at once: a session reset, or the session ending. */
  onFilesCleared?: (files: readonly UploadedFile[]) => void;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  sessionUrl,
  clientId,
  header,
  showHeader = false,
  showLogo = true,
  clickQrCodeToReload = false,
  size = "large",
  filePreviewMode = "grid",
  autoResession = false,
  showDownloadButton = false,
  showFilePreviews = true,
  core: providedCore,
  onFileAvailable,
  onFileRemoved,
  onFilesCleared,
}) => {
  const { state, retrySession, core } = useQrCodeCore({
    sessionUrl,
    clientId,
    autoResession,
    core: providedCore,
    onFileAvailable,
    onFileRemoved,
    onFilesCleared,
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
              onClick={() => {
                void retrySession();
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
          onClick={() => {
            if (clickQrCodeToReload) {
              void retrySession();
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
              onClick={() => {
                void retrySession();
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
        {showFilePreviews && (
          <div className="sqg-file-container">
            {filePreviewMode === "grid" ? (
              state.uploadedFiles.map((file, index) => (
                <DocumentPreviewer key={index} file={file} />
              ))
            ) : (
              <FileList files={state.uploadedFiles} />
            )}
          </div>
        )}
        {showDownloadButton ? <DownloadButton core={core} /> : null}
      </div>
    </section>
  );
};
