import {
    ChangeDetectionStrategy,
    Component,
    effect,
    Injector,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    signal,
    SimpleChanges
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { LogoComponent } from './components/logo.component';
import { DocumentPreviewerComponent } from './components/document-previewer.component';
import { FileListComponent } from './components/file-list.component';
import { DownloadButtonComponent } from './components/download-button.component';
import { useQrCodeCore, type QrCodeCoreController } from './use-qr-code-core';
import { generateQrSvg } from './qrcode';
import { REDO_SVG } from './icons';

export type FilePreviewMode = 'list' | 'grid';
export type QrCodeSize = 'small' | 'medium' | 'large' | 'xlarge';

@Component({
    selector: 'sqg-qr-code-generator',
    standalone: true,
    imports: [LogoComponent, DocumentPreviewerComponent, FileListComponent, DownloadButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="sqg-root" [attr.data-size]="size">
            @if (controller && controller.state().loading) {
                <div class="sqg-overlay">
                    <div class="sqg-loading-content">
                        <div class="sqg-spinner"></div>
                        <p class="sqg-loading-text">Loading...</p>
                    </div>
                </div>
            }
            @if (controller && !controller.state().loading && controller.state().retry) {
                <div class="sqg-overlay">
                    <div class="sqg-error-content">
                        <p class="sqg-error-text">Cannot create session</p>
                        <button class="sqg-retry-btn" [innerHTML]="redoIcon" (click)="retry()"></button>
                    </div>
                </div>
            }
            <div class="sqg-content">
                @if (showHeader) {
                    <header class="sqg-header">
                        <h1 class="sqg-header-title">{{ header }}</h1>
                    </header>
                }
                <div
                    aria-label="QR Code for file upload"
                    class="sqg-qr-wrapper"
                    [style.cursor]="clickQrCodeToReload ? 'pointer' : null"
                    (click)="onQrClick()"
                >
                    <div class="sqg-qr-inner">
                        <div class="sqg-qr-svg" [innerHTML]="qrSvg()"></div>
                        @if (showLogo) {
                            <div class="sqg-logo-overlay">
                                <sqg-logo [isConnected]="controller?.state()?.isConnected ?? false"></sqg-logo>
                            </div>
                        }
                    </div>
                    <p class="sqg-sr-only">QR Code that allows uploads from {{ controller?.state()?.deviceLoginUrl }}</p>
                </div>
                @if (!clickQrCodeToReload) {
                    <div class="sqg-reload-section">
                        <button class="sqg-reload-btn" (click)="retry()"><span [innerHTML]="redoIcon"></span> <span>Reload</span></button>
                    </div>
                } @else {
                    <div class="sqg-reload-section">
                        <p class="sqg-hint-text">Click QR code to reload</p>
                    </div>
                }
                <div class="sqg-file-container">
                    @if (filePreviewMode === 'grid') {
                        @for (file of controller?.state()?.uploadedFiles ?? []; track file.id) {
                            <sqg-document-previewer [file]="file"></sqg-document-previewer>
                        }
                    } @else {
                        <sqg-file-list [files]="controller?.state()?.uploadedFiles ?? []"></sqg-file-list>
                    }
                </div>
                @if (showDownloadButton) {
                    <sqg-download-button [core]="controller?.core"></sqg-download-button>
                }
            </div>
        </section>
    `
})
export class QrCodeGeneratorComponent implements OnInit, OnChanges, OnDestroy {
    @Input({ required: true }) sessionUrl!: string;
    @Input() clientId?: string;
    @Input() showHeader = false;
    @Input() header = '';
    @Input() showLogo = true;
    @Input() clickQrCodeToReload = false;
    @Input() filePreviewMode: FilePreviewMode = 'grid';
    @Input() size: QrCodeSize = 'large';
    /** Automatically replace an expired session. Default: false. */
    @Input() autoResession = false;
    @Input() showDownloadButton = false;

    protected controller?: QrCodeCoreController;
    protected readonly qrSvg = signal<SafeHtml>('');
    protected readonly redoIcon: SafeHtml;

    constructor(
        private readonly sanitizer: DomSanitizer,
        private readonly injector: Injector
    ) {
        this.redoIcon = sanitizer.bypassSecurityTrustHtml(REDO_SVG);
    }

    ngOnInit(): void {
        this.controller = useQrCodeCore({
            sessionUrl: this.sessionUrl,
            clientId: this.clientId,
            autoResession: this.autoResession
        });
        this.controller.start();

        // Regenerate the QR SVG whenever the device login URL changes.
        effect(
            () => {
                const url = this.controller?.state().deviceLoginUrl || 'http://localhost';
                generateQrSvg(url, 200)
                    .then((svg) => this.qrSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg)))
                    .catch(() => undefined);
            },
            { injector: this.injector }
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.controller && (changes['sessionUrl'] || changes['clientId'])) {
            void this.controller.setOptions({
                sessionUrl: this.sessionUrl,
                clientId: this.clientId
            });
        }
    }

    ngOnDestroy(): void {
        this.controller?.dispose();
    }

    protected retry(): void {
        void this.controller?.retrySession();
    }

    protected onQrClick(): void {
        if (this.clickQrCodeToReload) {
            void this.controller?.retrySession();
        }
    }
}
