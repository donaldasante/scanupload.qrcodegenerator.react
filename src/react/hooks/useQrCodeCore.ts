import { useEffect, useRef, useSyncExternalStore } from 'react';
import { QrCodeGeneratorCore } from '../../core/QrCodeGeneratorCore';

export function useQrCodeCore(sessionUrl: string, refreshTokenUrl: string) {
    const coreRef = useRef<QrCodeGeneratorCore | null>(null);

    // Instantiate once — stable across re-renders.
    if (coreRef.current === null) {
        coreRef.current = new QrCodeGeneratorCore(sessionUrl, refreshTokenUrl);
    }

    const core = coreRef.current;

    useEffect(() => {
        core.start();
        return () => core.dispose();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUrl]);

    const state = useSyncExternalStore(
        (listener) => core.subscribe(listener),
        () => core.getState()
    );

    return {
        state,
        retrySession: () => core.retrySession()
    };
}
