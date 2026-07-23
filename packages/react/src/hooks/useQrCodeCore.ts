import { useEffect, useRef, useSyncExternalStore } from "react";
import { QrCodeGeneratorCore } from "@scanupload/qr-code-generator-core";
import type { DownloadSessionZipResult, QrCodeGeneratorCoreOptions } from "@scanupload/qr-code-generator-core";

export function useQrCodeCore(options: QrCodeGeneratorCoreOptions) {
  const coreRef = useRef<QrCodeGeneratorCore | null>(null);

  // Instantiate once — stable across re-renders.
  coreRef.current ??= new QrCodeGeneratorCore(options);

  const core = coreRef.current;

  useEffect(() => {
    core.start();
    return () => core.dispose();
  }, [core]);

  useEffect(() => {
    void core.setOptions({
      sessionUrl: options.sessionUrl,
      clientId: options.clientId,
      downloadUrl: options.downloadUrl,
    });
  }, [core, options.sessionUrl, options.clientId, options.downloadUrl]);

  const state = useSyncExternalStore(
    (listener) => core.subscribe(listener),
    () => core.getState(),
  );

  return {
    state,
    /** Underlying core instance — useful for components (e.g. `DownloadButton`) that need access to live methods. */
    core,
    retrySession: () => core.retrySession(),
    /** Triggers a fetch of the session ZIP. Returns a structured result; never throws. */
    downloadZip: (): Promise<DownloadSessionZipResult> => core.downloadSessionZip(),
    /** Whether a download can currently be triggered: session is active AND a downloadUrl is configured. */
    canDownloadZip: (): boolean => core.canDownloadZip()
  };
}
