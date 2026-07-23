import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges
} from '@angular/core';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

@Component({
    selector: 'sqg-download-button',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sqg-download">
            <button
                type="button"
                class="sqg-download-btn"
                [disabled]="!canDownload || downloading"
                [attr.aria-busy]="downloading ? true : null"
                (click)="onClick()"
            >
                {{ downloading ? 'Downloading…' : label }}
            </button>
            <p *ngIf="error" class="sqg-download-error" role="alert">{{ error }}</p>
        </div>
    `
})
export class DownloadButtonComponent implements OnChanges, OnDestroy {
    /** Core instance returned by {@link useQrCodeCore}. */
    @Input({ required: true }) core!: QrCodeGeneratorCore;
    /** Label for the button. Default: "Download". */
    @Input() label = 'Download';

    @Output() readonly downloadStart = new EventEmitter<void>();
    @Output() readonly downloadComplete = new EventEmitter<void>();
    @Output() readonly downloadError = new EventEmitter<string>();

    downloading = false;
    error: string | null = null;
    canDownload = false;

    private _unsubscribe: (() => void) | null = null;
    private _tickScheduled = false;
    private _errorTimer: ReturnType<typeof setTimeout> | null = null;

    private _setError(msg: string | null): void {
        this.error = msg;
        if (this._errorTimer) { clearTimeout(this._errorTimer); this._errorTimer = null; }
        if (msg) {
            this._errorTimer = setTimeout(() => { this.error = null; this._errorTimer = null; }, 5000);
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['core']) {
            // Re-subscribe to the new core instance.
            this._unsubscribe?.();
            this._unsubscribe = null;
            if (this.core) {
                this._refreshCanDownload();
                this._unsubscribe = this.core.subscribe(() => this._scheduleRefresh());
            }
        }
    }

    ngOnDestroy(): void {
        this._unsubscribe?.();
        this._unsubscribe = null;
        if (this._errorTimer) { clearTimeout(this._errorTimer); this._errorTimer = null; }
    }

    async onClick(): Promise<void> {
        this._setError(null);
        this.downloading = true;
        this.downloadStart.emit();
        try {
            const result = await this.core.downloadSessionZip();
            if (result.ok) {
                triggerBrowserDownload(result.blob, result.filename);
                this.downloadComplete.emit();
            } else {
                this._setError(result.error);
                this.downloadError.emit(result.error);
            }
        } catch (err) {
            console.warn('DownloadButton error:', err);
            this._setError('Unexpected error — please try again.');
            this.downloadError.emit(this.error!);
        } finally {
            this.downloading = false;
        }
    }

    private _scheduleRefresh(): void {
        if (this._tickScheduled) return;
        this._tickScheduled = true;
        queueMicrotask(() => {
            this._tickScheduled = false;
            this._refreshCanDownload();
        });
    }

    private _refreshCanDownload(): void {
        const next = this.core.canDownloadZip();
        // Clear stale errors when a new session becomes available.
        if (next && !this.canDownload) this.error = null;
        if (next !== this.canDownload) this.canDownload = next;
    }
}
