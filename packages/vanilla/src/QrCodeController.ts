import { QrCodeGeneratorCore, type QrCodeGeneratorCoreOptions, type QrCodeGeneratorState } from '@scanupload/qr-code-generator-core';

/**
 * Headless controller that wraps QrCodeGeneratorCore for vanilla JS/TS usage.
 *
 * It mirrors the core lifecycle (start → subscribe → dispose) and adds a
 * convenient `onChange` callback so consumers don't need to manage listeners
 * manually.
 *
 * @example
 * ```ts
 * import { QrCodeController } from '@scanupload/qr-code-generator-vanilla';
 *
 * const ctrl = new QrCodeController({
 *   sessionUrl: '/api/session',
 *   refreshTokenUrl: '/api/token',
 *   onChange(state) {
 *     document.getElementById('qr')!.textContent = state.deviceLoginUrl;
 *   },
 * });
 *
 * ctrl.start();
 * // later…
 * ctrl.dispose();
 * ```
 */
export interface QrCodeControllerOptions extends QrCodeGeneratorCoreOptions {
    /**
     * Called every time the core state changes.
     * Use this to update the DOM or any external view.
     */
    onChange?: (state: QrCodeGeneratorState) => void;
}

export class QrCodeController {
    private readonly _core: QrCodeGeneratorCore;
    private _unsubscribe: (() => void) | null = null;

    constructor(private readonly _options: QrCodeControllerOptions) {
        const { onChange, ...coreOpts } = _options;
        this._core = new QrCodeGeneratorCore(coreOpts);
    }

    /** Current snapshot of the generator state. */
    getState(): QrCodeGeneratorState {
        return this._core.getState();
    }

    /** Start the session and begin listening for state changes. */
    async start(): Promise<void> {
        if (this._options.onChange) {
            this._unsubscribe = this._core.subscribe(() => {
                this._options.onChange!(this._core.getState());
            });
        }
        await this._core.start();
    }

    /** Tear down the SignalR connection and stop listening. */
    dispose(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
        this._core.dispose();
    }

    /** Drop the current session and obtain a new one. */
    async retrySession(): Promise<void> {
        await this._core.retrySession();
    }
}
