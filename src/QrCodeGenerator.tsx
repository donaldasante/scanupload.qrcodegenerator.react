import React, { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import Logo from "./components/Logo";
import { postData } from "./services/apiClient";
import { debounceAsync, isExpired, isNullOrEmpty } from "./utility/utilities";
import { FaRedo } from "react-icons/fa";
import { usePersistentState } from "./react/hooks/usePersistentState";
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { DocumentPreviewer } from "./components/DocumentPreviewer";
import { FileList } from "./components/FileList";
import { cn } from "./utility/cn";

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

export interface SessionResponse {
  sessionId: string;
  accessToken: string;
  hubUrl: string;
  deviceLoginUrl: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "added" | "uploading" | "success" | "error";
  error?: string;
  url?: string;
  thumbnailBase64?: string;
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
  const [loading, setLoading] = useState(true);
  const [qrSize, setQrSize] = useState<number>(160);
  const [deviceLoginUrl, setDeviceLoginUrl] = useState<string>("");
  const [containerSize, setContainerSize] = useState<string>(
    "w-32 h-32 md:w-40 md:h-40",
  );
  const [logoSize, setLogoSize] = useState<string>("w-2 h-2");
  const [filePreviewSize, setFilePreviewSize] = useState<
    "sm" | "md" | "lg" | "xlg"
  >("sm");
  const [retry, setRetry] = useState<boolean>(false);
  const [lastSessionIds, setLastSessionIds] = usePersistentState<string[]>(
    "qrcode-last-session-ids",
    [],
  );
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<HubConnection | null | undefined>(null);
  const sessionRef = useRef<SessionResponse | null>(null);
  const lastSessionIdsRef = useRef(lastSessionIds);
  const tokenRef = useRef<string>("");
  const retryCountRef = useRef<number>(0);
  const [uploadFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sessionDeleted, setSessionDeleted] = useState<boolean>(false);

  useEffect(() => {
    const unique = [...new Set(lastSessionIds)];
    lastSessionIdsRef.current = unique;
  }, [lastSessionIds]);

  useEffect(() => {
    if (isNullOrEmpty(sessionUrl)) {
      return;
    }

    let disposed = false;
    let connection: HubConnection | null | undefined = null;
    // AbortController lets us cancel an in-flight session request when this
    // effect cleans up. This is critical for React StrictMode, which mounts →
    // unmounts → remounts every effect in development. Without aborting, both
    // the first (discarded) and second (real) mount fire a session POST, and the
    // second mount silently reuses the first session while a second orphaned
    // session is created server-side — causing the QR code to point to a
    // session whose hub the component is not actually listening on.
    const abortController = new AbortController();

    const start = async () => {
      const hubUrl = await getHubUrlAsync(abortController.signal);

      if (disposed) return;

      const localConnection = await createHubConnectionAsync(hubUrl);
      try {
        await localConnection?.start();

        if (disposed) {
          await localConnection?.stop();
          return;
        }

        connection = localConnection;
        connectionRef.current = localConnection;

        setIsConnected(true);
        setLoading(false);
        setRetry(false);

        console.log("SignalR Connected successfully");
      } catch (err) {
        if (!disposed) {
          console.error(err);
        }
      }
    };

    start();

    return () => {
      disposed = true;

      // Cancel any in-flight session fetch so the remount starts completely
      // fresh. Without this, the second mount would see sessionRef.current
      // already populated (by the first mount's still-resolving request) and
      // silently skip creating a new session, leaving a mismatch between the
      // QR code URL and the hub the component is actually connected to.
      abortController.abort("Component unmounted");
      sessionRef.current = null;

      if (connection) {
        connection.stop().catch(console.error);
      }

      if (connectionRef.current === connection) {
        connectionRef.current = null;
      }
    };
  }, [sessionUrl]);

  useEffect(() => {
    switch (size) {
      case "small":
        setContainerSize("w-16 h-16 md:w-20 md:h-20");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        // Adjust QR code size or styles for small
        break;
      case "medium":
        setContainerSize("w-24 h-24 md:w-30 md:h-30");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        // Adjust QR code size or styles for medium
        break;
      case "large":
        setContainerSize("w-32 h-32 md:w-40 md:h-40");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        // Adjust QR code size or styles for large
        break;
      case "xlarge":
        setContainerSize("w-40 h-40 md:w-48 md:h-48");
        setLogoSize("w-2 h-2");
        setQrSize(200);
        setFilePreviewSize("xlg");
        // Adjust QR code size or styles for large
        break;
      default:
    }

    return () => {
      // Cleanup if necessary
    };
  }, [size]);

  async function getAccessToken(): Promise<string> {
    try {
      if (!tokenRef.current || isExpired(tokenRef.current, 60)) {
        const response = await postData<TokenResponse>(refreshTokenUrl, {
          timeout: 160000,
        });
        tokenRef.current = response.access_token;
      }
      return tokenRef.current;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    } finally {
      // Optional cleanup actions
    }
  }

  const getSessionInformationAsync = async (signal?: AbortSignal) => {
    if (sessionRef.current) return;
    setLoading(true);
    try {
      const response = await postData<SessionResponse>(
        sessionUrl,
        { lastSessionIds: lastSessionIdsRef.current },
        {
          timeout: 300000,
          signal,
        },
      );
      // Don't update state if the effect that triggered this call was cleaned up
      if (signal?.aborted) return;
      sessionRef.current = response;
      const deviceLoginHubUrl = buildDeviceLoginUrl(response);
      console.log("Device Login URL:", deviceLoginHubUrl);
      setDeviceLoginUrl(deviceLoginHubUrl);
      setLastSessionIds([response.sessionId]);
    } catch (error) {
      // Ignore errors caused by intentional abort (StrictMode cleanup / unmount)
      if (signal?.aborted) return;
      if (!retry) {
        setRetry(true);
        setLoading(false);
      }
    }
  };

  const deleteCurrentSessionAsync = async () => {
    if (!sessionRef.current) return;
    setIsConnected(false);
    setRetry(false);
    setUploadedFiles([]);
    sessionRef.current = null;
    connectionRef.current?.stop();
    connectionRef.current = null;
  };

  function isEmptyString(value: string) {
    return typeof value === "string" && value.trim().length === 0;
  }

  const createHubConnectionAsync = async (
    hubUrl: string,
  ): Promise<HubConnection | undefined | null> => {
    if (isEmptyString(hubUrl)) {
      console.log("Hub URL is empty, cannot create connection.");
      return;
    }

    let connection: HubConnection | null | undefined;
    try {
      connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          withCredentials: false,
          accessTokenFactory: () => getAccessToken(),
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, then max 30s
            return Math.min(
              16000,
              Math.pow(2, retryContext.previousRetryCount) * 1000,
            );
          },
        })
        .build();

      connection.on("FileAdded", (message: UploadedFile) => {
        //console.log(message);
        setUploadedFiles((prev) =>
          prev.some((f) => f.id === message.id) ? prev : [...prev, message],
        );
      });

      connection.on("FileRemoved", (message: UploadedFile) => {
        //console.log(message);
        setUploadedFiles((prev) => {
          if (!prev.some((f) => f.id === message.id)) return prev;
          return prev.filter((f) => f.id !== message.id);
        });
      });

      connection.on("FileProgress", (fileId: string, progress: number) => {
        //console.log(fileId, progress);
        setUploadedFiles((prev) =>
          prev.map((file) =>
            file.id === fileId ? { ...file, progress } : file,
          ),
        );
      });

      connection.on(
        "FileSendImageResized",
        (fileId: string, thumbnailBase64: string) => {
          //console.log(fileId, "thumbnail received");
          setUploadedFiles((prev) =>
            prev.map((file) =>
              file.id === fileId ? { ...file, thumbnailBase64 } : file,
            ),
          );
        },
      );

      connection.on("sessionDisconnected", (sessionId: string) => {
        //console.log("Session disconnected:", sessionId);
        setSessionDeleted(false);
        deleteCurrentSessionAsync();
      });

      connection.on("sessionReset", (sessionId: string) => {
        //console.log("Session reset:", sessionId);
        setSessionDeleted(false);
        setUploadedFiles([]);
      });

      // Connection event handlers
      connection.onreconnecting((error) => {
        console.log("Connection lost, attempting to reconnect...", error);

        if (retryCountRef.current >= 4) {
          setIsConnected(false);
        } else {
          retryCountRef.current += 1;
        }
        console.log("Retry count:", retryCountRef.current);
      });

      connection.onreconnected(async (connectionId) => {
        console.log("Connection re-established:", connectionId);

        try {
          // Replace local file state with the server's current list.
          // This covers any FileAdded / FileRemoved events missed during
          // the disconnection window.
          const files =
            (await connection?.invoke<UploadedFile[]>(
              "GetSessionFiles",
              sessionRef.current?.sessionId,
            )) ?? [];
          setUploadedFiles((prev) => {
            const prevMap = new Map(prev.map((f) => [f.id, f]));
            return files.map((serverFile) => {
              const existing = prevMap.get(serverFile.id);
              // Preserve the locally-cached thumbnail if we already have one,
              // since the backend cannot supply it yet.
              return existing
                ? {
                    ...serverFile,
                    thumbnailBase64:
                      existing.thumbnailBase64 ?? serverFile.thumbnailBase64,
                  }
                : serverFile;
            });
          });
        } catch (err) {
          console.error("Failed to resync files after reconnect:", err);
          // Non-fatal: keep whatever we have locally rather than clearing.
        }

        setIsConnected(true);
        setLoading(false);
        setRetry(false);
        setSessionDeleted(false);
        retryCountRef.current = 0;
      });

      connection.onclose((error) => {
        console.log("Connection closed", error);
        setSessionDeleted(false);
        setIsConnected(false);
        setUploadedFiles([]);
      });
      connection.serverTimeoutInMilliseconds = 60000;
      connection.keepAliveIntervalInMilliseconds = 15000;
    } catch (error) {
      console.error("SignalR Connection failed:", error);
      // Retry connection after delay
      setLoading(false);
      setRetry(true);
    } finally {
      //setLoading(false);
    }
    return connection;
  };

  const getHubUrlAsync = async (signal?: AbortSignal): Promise<string> => {
    await getSessionInformationAsync(signal);
    return sessionRef.current?.hubUrl ?? "";
  };

  const getDataAsync = async (): Promise<HubConnection | null | undefined> => {
    const hub = await getHubUrlAsync(undefined);
    const connection = await createHubConnectionAsync(hub);
    return connection;
  };

  const debouncedGetDataAsync = useCallback(
    debounceAsync(getDataAsync, 1000),
    [],
  );

  const retrySessionAsync = async () => {
    setUploadedFiles([]);
    await deleteCurrentSessionAsync();

    connectionRef.current = await debouncedGetDataAsync();
    connectionRef.current?.start();
    setIsConnected(true);
    setLoading(false);
    setRetry(false);
  };

  function buildDeviceLoginUrl(response: SessionResponse): string {
    const url = new URL(response.deviceLoginUrl);
    return url.toString();
  }

  return (
    <section
      className={cn("relative overflow-hidden p-2", classNames.root)}
      style={style}
    >
      {/* Loading overlay scoped to this component */}
      {loading && (
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
      {!loading && retry && (
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
                await retrySessionAsync();
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
              await retrySessionAsync();
            }
          }}
          className={cn(
            `bg-white p-2 rounded-2xl border-2 border-dashed ${containerSize} flex border-gray-300 items-center justify-center transition-all duration-300 hover:shadow-lg hover:scale-105`,
            classNames.qrWrapper,
          )}
        >
          <div className="relative inline-block">
            <QRCode
              value={deviceLoginUrl}
              size={qrSize}
              className="w-full h-full"
            />
            {showLogo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`bg-white ${logoSize} rounded flex items-center justify-center`}
                >
                  <span className="text-xs font-bold">
                    <Logo size={size} isConnected={isConnected} />
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="sr-only">
            QR Code that allows uploads from {deviceLoginUrl}
          </p>
        </div>
        {!clickQrCodeToReload ? (
          <div className="flex flex-row mt-3">
            <button
              onClick={async () => {
                await retrySessionAsync();
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
            uploadFiles.map((file, index) => (
              <DocumentPreviewer
                key={index}
                file={file}
                size={filePreviewSize}
              />
            ))
          ) : (
            <FileList files={uploadFiles} />
          )}
        </div>
      </div>
    </section>
  );
};
