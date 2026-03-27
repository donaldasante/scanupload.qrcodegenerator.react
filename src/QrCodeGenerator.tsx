import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import Logo from "./components/Logo";
import { FaRedo } from "react-icons/fa";
import { DocumentPreviewer } from "./components/DocumentPreviewer";
import { FileList } from "./components/FileList";
import { cn } from "./utility/cn";
import { useQrCodeCore } from "./react/hooks/useQrCodeCore";
export type { SessionResponse, TokenResponse, UploadedFile } from "./core/types";

/**
 * Slot-based className overrides for QrCodeGenerator.
 * Each key targets a specific UI region. Classes are merged with the
 * built-in defaults via tailwind-merge, so Tailwind conflicts are always
 * resolved in favour of the override.
 *
 * @example
 * <QrCodeGenerator
 *   classNames={{
 *     qrWrapper: "rounded-none border-solid border-blue-500",
 *     reloadButton: "bg-red-500 hover:bg-red-700",
 *   }}
 * />
 */
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
  /**
   * Slot-based overrides for individual UI regions.
   * Classes are merged with built-in defaults; conflicts resolved by tailwind-merge.
   */
  classNames?: QrCodeClassNames;
  /**
   * Inline styles applied to the root <section>.
   * Ideal for injecting CSS custom properties that drive theming, e.g.
   * style={{ "--qr-accent": "#1d4ed8", "--qr-border": "#d1d5db" } as React.CSSProperties}
   */
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
  const { state, retrySession } = useQrCodeCore(sessionUrl, refreshTokenUrl);

  const [qrSize, setQrSize] = useState<number>(160);
  const [containerSize, setContainerSize] = useState<string>(
    "w-32 h-32 md:w-40 md:h-40",
  );
  const [logoSize, setLogoSize] = useState<string>("w-2 h-2");
  const [filePreviewSize, setFilePreviewSize] = useState<
    "sm" | "md" | "lg" | "xlg"
  >("sm");

  useEffect(() => {
    switch (size) {
      case "small":
        setContainerSize("w-16 h-16 md:w-20 md:h-20");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        break;
      case "medium":
        setContainerSize("w-24 h-24 md:w-30 md:h-30");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        break;
      case "large":
        setContainerSize("w-32 h-32 md:w-40 md:h-40");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        break;
      case "xlarge":
        setContainerSize("w-40 h-40 md:w-48 md:h-48");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        break;
    }
  }, [size]);


  return (
    <section
      className={cn("relative overflow-hidden p-2", classNames.root)}
      style={style}
    >
      {/* Loading overlay scoped to this component */}
      {state.loading && (
        <div
          className={cn(
            "absolute inset-0 bg-white/90 flex items-center justify-center rounded-md z-10",
            classNames.loadingOverlay,
          )}
        >
          <div className="flex flex-col items-center text-center mt-0 gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-800 border-dashed"></div>
            <div className="text-center h-10 w-10">
              <p className="text-gray-900">Loading...</p>
            </div>
          </div>
        </div>
      )}
      {!state.loading && state.retry && (
        <div
          className={cn(
            "absolute inset-0 bg-white/90 flex items-center justify-center rounded-md z-10",
            classNames.errorOverlay,
          )}
        >
          <div className="flex flex-col items-center text-center mt-5 gap-2">
            <div className="text-center text-xs">
              <p className="text-gray-900">Cannot create session</p>
            </div>
            <button
              onClick={async () => {
                await retrySession();
              }}
              className={cn(
                "bg-blue-300 text-white py-1 px-2 rounded-md hover:bg-blue-500 transition-colors",
                classNames.errorButton,
              )}
            >
              <FaRedo className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center text-center">
        {showHeader && (
          <>
            <header className="mb-2">
              <h1
                className={cn(
                  "text-xl font-semibold text-gray-600",
                  classNames.header,
                )}
              >
                {header}
              </h1>
            </header>
          </>
        )}
        <div
          aria-label="QR Code for file upload"
          onClick={async () => {
            if (clickQrCodeToReload) {
              await retrySession();
            }
          }}
          className={cn(
            `bg-white p-2 rounded-2xl border-2 border-dashed ${containerSize} flex border-gray-300 items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105`,
            classNames.qrWrapper,
          )}
        >
          <div className="relative inline-block">
            <QRCode
              value={state.deviceLoginUrl}
              size={qrSize}
              className="w-full h-full"
            />
            {showLogo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`bg-white ${logoSize} rounded flex items-center justify-center`}
                >
                  <span className="text-xs font-bold">
                    <Logo size={size} isConnected={state.isConnected} />
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="sr-only">
            QR Code that allows uploads from {state.deviceLoginUrl}
          </p>
        </div>
        {!clickQrCodeToReload ? (
          <div className="flex flex-row mt-3">
            <button
              onClick={async () => {
                await retrySession();
              }}
              className={cn(
                "bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors flex flex-row items-center",
                classNames.reloadButton,
              )}
            >
              <FaRedo className="h-4 w-4" />{" "}
              <span className="ml-3">Reload</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-row mt-3">
            <p className={cn("text-gray-500", classNames.hintText)}>
              Click QR code to reload
            </p>
          </div>
        )}
        <div
          className={cn(
            "flex flex-row justify-center gap-1 flex-wrap",
            classNames.fileContainer,
          )}
        >
          {filePreviewMode === "grid" ? (
            state.uploadedFiles.map((file, index) => (
              <DocumentPreviewer
                key={index}
                file={file}
                size={filePreviewSize}
              />
            ))
          ) : (
            <FileList files={state.uploadedFiles} />
          )}
        </div>
      </div>
    </section>
  );
};
