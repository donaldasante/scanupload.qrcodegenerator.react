import { useEffect, useRef, useSyncExternalStore } from "react";
import { QrCodeGeneratorCore } from "@scanupload/qr-code-generator-core";
import type { QrCodeGeneratorCoreOptions } from "@scanupload/qr-code-generator-core";

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
    });
  }, [core, options.sessionUrl, options.clientId]);

  const state = useSyncExternalStore(
    (listener) => core.subscribe(listener),
    () => core.getState(),
  );

  return {
    state,
    retrySession: () => core.retrySession(),
  };
}
