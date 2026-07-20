import { signal, type Signal } from '@angular/core';
import { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorState, StorageAdapter } from '@scanupload/qr-code-generator-core';

export interface UseQrCodeCoreOptions {
    sessionUrl: string;
    storage?: StorageAdapter;
}

export interface QrCodeCoreController {
    /** Reactive snapshot of the core state. */
    state: Signal<QrCodeGeneratorState>;
    /** Subscribe to the core and start the live session. */
    start(): void;
    /** Tear down the current session and create a new one. */
    retrySession(): Promise<void>;
    /** Update the API endpoint at runtime (mirrors the core `setOptions`). */
    setOptions(opts: { sessionUrl?: string }): Promise<void>;
    /** Unsubscribe and dispose the underlying core. */
    dispose(): void;
}

/**
 * Signal-based controller that wraps {@link QrCodeGeneratorCore}, mirroring the
 * React `useQrCodeCore` hook and the Vue `useQrCodeCore` composable.
 *
 * Instantiate it once the component inputs are available (e.g. in `ngOnInit`),
 * call `start()`, and `dispose()` on destroy.
 */
export function useQrCodeCore(options: UseQrCodeCoreOptions): QrCodeCoreController {
    const core = new QrCodeGeneratorCore({
        sessionUrl: options.sessionUrl,
        storage: options.storage
    });

    const state = signal<QrCodeGeneratorState>(core.getState());

    let unsubscribe: (() => void) | null = null;

    return {
        state: state.asReadonly(),
        start() {
            unsubscribe = core.subscribe(() => state.set(core.getState()));
            state.set(core.getState());
            void core.start();
        },
        retrySession: () => core.retrySession(),
        setOptions: (opts) => core.setOptions(opts),
        dispose() {
            unsubscribe?.();
            unsubscribe = null;
            core.dispose();
        }
    };
}
