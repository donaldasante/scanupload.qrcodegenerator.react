import { useEffect, useRef, useSyncExternalStore } from 'react';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCoreOptions } from '@scanupload/qr-code-generator-core';

export function useQrCodeCore(options: QrCodeGeneratorCoreOptions) {
    const coreRef = useRef<QrCodeGeneratorCore | null>(null);

    // Instantiate once — stable across re-renders.
    coreRef.current ??= new QrCodeGeneratorCore(options);

    const core = coreRef.current;

    useEffect(() => {
        core.start();
        return () => core.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.sessionUrl]);

    const state = useSyncExternalStore(
        (listener) => core.subscribe(listener),
        () => core.getState()
    );

    return {
        state,
        retrySession: () => core.retrySession()
    };
}
