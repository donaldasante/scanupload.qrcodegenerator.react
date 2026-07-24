import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges
} from '@angular/core';
import { triggerBrowserDownload } from '@scanupload/qr-code-generator-core';
import type { QrCodeGeneratorCore, UploadedFile } from '@scanupload/qr-code-generator-core';

@Component({
    selector: 'sqg-download-button',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sqg-download">
            <button
                type="button"
                class="sqg-download-btn"
                [disabled]="downloading || fileCount === 0"
                [attr.aria-busy]="downloading || null"
                (click)="handleClick()"
            >
                {{ downloading
                    ? 'Downloading…'
                    : fileCount > 0
                        ? label + ' (' + fileCount + ')'
                        : label }}
            </button>
            @if (error) {
                <p class="sqg-download-error" role="alert">{{ error }}</p>
            }
        </div>
    `
})
export class DownloadButtonComponent implements OnInit, OnChanges, OnDestroy {
    @Input({ required: true }) core!: QrCodeGeneratorCore;
    @Input() label: string = 'Download all files';

    protected downloading = false;
    protected error: string | null = null;
    protected fileCount = 0;

    private unsubscribe: (() => void) | null = null;
    private errorTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly cdr: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.refresh();
        this.unsubscribe = this.core.subscribe(() => {
            this.refresh();
            this.cdr.markForCheck();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['core'] && this.unsubscribe) {
            // Re-attach subscription if `core` is swapped at runtime.
            this.unsubscribe();
            this.unsubscribe = this.core.subscribe(() => {
                this.refresh();
                this.cdr.markForCheck();
            });
            this.refresh();
        }
    }

    ngOnDestroy(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        if (this.errorTimer) clearTimeout(this.errorTimer);
    }

    private setError(msg: string | null): void {
        this.error = msg;
        if (this.errorTimer) { clearTimeout(this.errorTimer); this.errorTimer = null; }
        if (msg) {
            this.errorTimer = setTimeout(() => {
                this.error = null;
                this.errorTimer = null;
                this.cdr.markForCheck();
            }, 5000);
        }
    }

    private refresh(): void {
        this.fileCount = countDownloadable(this.core.getState().uploadedFiles);
    }

    protected async handleClick(): Promise<void> {
        this.setError(null);
        const files = this.core.getState().uploadedFiles.filter((f) => Boolean(f.url));
        if (files.length === 0) return;

        this.downloading = true;
        try {
            const results = await Promise.allSettled(files.map((file) => this.downloadFile(file)));
            const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
            if (failed.length > 0) {
                const firstReason = failed[0].reason;
                const message = firstReason instanceof Error
                    ? firstReason.message
                    : 'Some files failed to download.';
                this.setError(failed.length === files.length
                    ? `All downloads failed. ${message}`
                    : `${failed.length} of ${files.length} files failed. ${message}`);
            }
        } finally {
            this.downloading = false;
        }
    }

    private async downloadFile(file: UploadedFile): Promise<void> {
        if (!file.url) {
            throw new Error(`No download URL for "${file.name}".`);
        }

        let response: Response;
        try {
            response = await fetch(file.url, { credentials: 'include' });
        } catch {
            throw new Error(`Network error downloading "${file.name}".`);
        }

        if (!response.ok) {
            throw new Error(`"${file.name}" download failed (HTTP ${response.status}).`);
        }

        const blob = await response.blob();
        triggerBrowserDownload(blob, file.name || deriveFilename(file.url));
    }
}

function countDownloadable(files: readonly UploadedFile[]): number {
    return files.reduce((n, f) => (f.url ? n + 1 : n), 0);
}

function deriveFilename(url: string): string {
    try {
        const pathname = new URL(url, window.location.href).pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        return last ?? 'download';
    } catch {
        return 'download';
    }
}
