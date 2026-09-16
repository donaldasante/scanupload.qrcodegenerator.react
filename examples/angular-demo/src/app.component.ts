import {
    AfterViewChecked,
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnDestroy,
    inject,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/dashboard';
import XHRUpload from '@uppy/xhr-upload';
import ScanUploadPlugin from '@scanupload/qr-code-generator-uppy';
import { QrCodeGeneratorComponent } from '@scanupload/qr-code-generator-angular';
import type { QrCodeGeneratorCore } from '@scanupload/qr-code-generator-core';

type FilePreviewMode = 'list' | 'grid';
type QrCodeSize = 'small' | 'medium' | 'large' | 'xlarge';

interface SizeOption {
    value: QrCodeSize;
    label: string;
}

function readSessionUrl(): string {
    const value = import.meta.env.VITE_SESSION_URL;
    if (!value) {
        throw new Error('VITE_SESSION_URL is not set. Copy .env.example to .env.local or provide it as a Docker build argument.');
    }
    return value;
}

function readClientId(): string {
    const value = import.meta.env.VITE_CLIENT_ID;
    if (!value) {
        throw new Error('VITE_CLIENT_ID is not set. Copy .env.example to .env.local or provide it as a Docker build argument.');
    }
    return value;
}

/** Where Uppy sends files. Defaults to the mock endpoint in `vite.config.js`. */
const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT || '/demo-upload';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, FormsModule, QrCodeGeneratorComponent],
    template: `
        <h2 class="demo-title">Example Form</h2>

        <div class="demo-card">
            <div class="mb-6">
                <div class="flex flex-col">
                    <div class="checkbox-row">
                        <input
                            id="checkQrCodeLogo"
                            type="checkbox"
                            [(ngModel)]="showQrCodeLogo"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label for="checkQrCodeLogo" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                            Show Logo
                        </label>
                    </div>

                    <div class="checkbox-row">
                        <input
                            id="checkClickReload"
                            type="checkbox"
                            [(ngModel)]="clickQrcodeReload"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label for="checkClickReload" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                            Click QR code to reload
                        </label>
                    </div>

                    <div class="checkbox-row">
                        <input
                            id="checkHeader"
                            type="checkbox"
                            [(ngModel)]="showHeader"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label for="checkHeader" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                            Show header
                        </label>
                    </div>

                    <div class="checkbox-row">
                        <input
                            id="checkDownloadButton"
                            type="checkbox"
                            [(ngModel)]="showDownloadButton"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label
                            for="checkDownloadButton"
                            class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left"
                        >
                            Show download button
                        </label>
                    </div>

                    <div class="checkbox-row">
                        <input
                            id="checkFilePreviews"
                            type="checkbox"
                            [(ngModel)]="showFilePreviews"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label for="checkFilePreviews" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                            Show file previews
                        </label>
                    </div>

                    <div class="flex items-center mt-2">
                        <label for="headerText" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
                            Header text
                        </label>
                        <input
                            id="headerText"
                            type="text"
                            [(ngModel)]="headerText"
                            class="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
                            placeholder="Enter header text"
                        />
                    </div>

                    <div class="flex flex-col gap-0 mt-2">
                        <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">File preview mode</div>
                        <div class="flex flex-row items-start mt-2 space-x-4">
                            <label class="flex items-center cursor-pointer group">
                                <input
                                    type="radio"
                                    name="file-preview-mode"
                                    value="list"
                                    [(ngModel)]="filePreviewMode"
                                    class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                    List
                                </span>
                            </label>
                            <label class="flex items-center cursor-pointer group">
                                <input
                                    type="radio"
                                    name="file-preview-mode"
                                    value="grid"
                                    [(ngModel)]="filePreviewMode"
                                    class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                    Grid
                                </span>
                            </label>
                        </div>
                    </div>

                    <div class="flex flex-col gap-0 mt-2">
                        <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">Qr Code size</div>
                        <div class="flex flex-row items-start mt-2 space-x-4">
                            <!-- items-start (not items-center) so the radio stays
                                 aligned at the top of the label, even when the
                                 label text wraps to two lines like "X-Large". -->
                            @for (size of sizeOptions; track size.value) {
                                <label class="flex items-start cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="qr-code-size"
                                        [value]="size.value"
                                        [(ngModel)]="qrCodeSize"
                                        class="h-4 w-4 mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <span class="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                        {{ size.label }}
                                    </span>
                                </label>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!--
            One card, two panels: the QR code for uploads from a phone on the
            left, the Uppy Dashboard for files from this device on the right.
        -->
        <section class="upload-box">
            <div class="half">
                <h2 class="half-title">From your phone</h2>
                @if (core(); as widgetCore) {
                    <div class="scan-widget">
                        <!-- Binding this widget to the plugin's core means it
                             renders the QR code for the session Uppy is already
                             listening to, instead of opening a second one. -->
                        <sqg-qr-code-generator
                            [sessionUrl]="sessionUrl"
                            [clientId]="clientId"
                            [core]="widgetCore"
                            [showHeader]="showHeader"
                            [header]="headerText"
                            [size]="qrCodeSize"
                            [showLogo]="showQrCodeLogo"
                            [clickQrCodeToReload]="clickQrcodeReload"
                            [filePreviewMode]="filePreviewMode"
                            [showDownloadButton]="showDownloadButton"
                            [showFilePreviews]="showFilePreviews"
                        ></sqg-qr-code-generator>
                    </div>
                } @else {
                    <p class="scan-pending">Connecting…</p>
                }
            </div>

            <div class="half">
                <h2 class="half-title">From this device</h2>
                <div class="uppy-shell" [class.has-files]="uppyFileCount() > 0">
                    <div class="uppy-host"></div>
                    <!-- Decorative badge for the empty drop zone; hidden by the
                         has-files class as soon as a file arrives. -->
                    @if (uppyFileCount() === 0) {
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="42"
                            height="42"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.25"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="drop-icon"
                            aria-hidden="true"
                        >
                            <path d="M12 3v12"></path>
                            <path d="m17 8-5-5-5 5"></path>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        </svg>
                    }
                </div>
            </div>
        </section>

        <p class="demo-back-link">
            <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline"> Back to ScanUpload </a>
        </p>
    `
})
export class AppComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    protected readonly sessionUrl = readSessionUrl();
    protected readonly clientId = readClientId();

    // ── Widget controls ─────────────────────────────────────────────────────

    protected showQrCodeLogo = true;
    protected clickQrcodeReload = true;
    protected showHeader = true;
    /**
     * Off by default: the button operates on the widget's file list, which is
     * only rendered when `showFilePreviews` is on. With previews off there is
     * nothing for it to act on, so it would sit there disabled.
     */
    protected showDownloadButton = false;
    /**
     * Off by default: Uppy renders everything the phone sends, so the widget's
     * own list would show the same files twice. Turn it on to exercise the
     * widget's preview list (and the two controls above it) instead.
     */
    protected showFilePreviews = false;
    protected filePreviewMode: FilePreviewMode = 'list';
    protected headerText = 'Scan to upload';
    protected qrCodeSize: QrCodeSize = 'large';

    protected readonly sizeOptions: SizeOption[] = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'xlarge', label: 'X-Large' }
    ];

    // ── Uppy + ScanUpload wiring ────────────────────────────────────────────
    //
    // Signals rather than plain fields: both are written from the boot step and
    // from Uppy callbacks, and a signal write is what schedules the render that
    // swaps "Connecting…" for the widget.
    //
    // The plugin owns the ScanUpload session and hands every file the phone
    // sends to Uppy. The widget below renders the QR code for that same core, so
    // both halves feed one Uppy instance and upload to the same place.
    protected readonly core = signal<QrCodeGeneratorCore | null>(null);
    protected readonly uppyFileCount = signal(0);

    // The host element is what the two nodes below are reached through. Query
    // decorators are out — the dev server compiles this component in JIT mode,
    // which rejects standard field decorators — and so are the signal queries
    // that replaced them: against a JIT-compiled view `viewChild` never resolves,
    // reading back `undefined` even inside `ngAfterViewChecked` while the nodes
    // are demonstrably in the DOM. Walking down from the host works in both
    // compilation modes and needs no change-detection timing assumptions.
    private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly changeDetector = inject(ChangeDetectorRef);

    private uppy?: Uppy;
    private scanObserver?: ResizeObserver;
    private observedSquare?: Element;
    private started = false;

    private get root(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    ngAfterViewInit(): void {
        // The view — and with it the Uppy host — exists from here on, so this is
        // the first point at which the Dashboard has anywhere to mount.
        if (this.started) return;
        this.started = true;

        this.startUppy();

        // Crossing the `66rem` breakpoint restacks the panels without changing
        // the size of either element, so no resize observer fires for that.
        window.addEventListener('resize', this.measureScan);
    }

    ngAfterViewChecked(): void {
        // Runs after the widget has taken its inputs, which is the point at
        // which a size or header change has actually reached the DOM. Measuring
        // is two rect reads and a style write, so doing it per check is cheap.
        this.measureScan();
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.measureScan);
        this.scanObserver?.disconnect();
        this.scanObserver = undefined;
        this.observedSquare = undefined;

        this.uppy?.destroy();
        this.uppy = undefined;
        this.core.set(null);
    }

    private startUppy(): void {
        const target = this.root.querySelector<HTMLElement>('.uppy-host');
        if (!target) return;

        const instance = new Uppy({
            autoProceed: true,
            allowMultipleUploadBatches: true
        });

        // Everything the hub receives from the phone is added to Uppy here,
        // through the same `addFile()` path the drop zone below ends up using.
        instance.use(ScanUploadPlugin, { sessionUrl: this.sessionUrl, clientId: this.clientId });

        // Where Uppy sends files from either source. Swap for @uppy/tus or
        // @uppy/aws-s3 without touching the ScanUpload plugin.
        instance.use(XHRUpload, {
            endpoint: uploadEndpoint,
            fieldName: 'file',
            getResponseData(xhr) {
                try {
                    return JSON.parse(xhr.responseText || '{}');
                } catch {
                    return { url: 'uploaded' };
                }
            }
        });

        // The Dashboard is the "drop files from this device" half. The plugin is
        // headless, so Uppy works without it too.
        instance.use(Dashboard, {
            inline: true,
            target,
            width: '100%',
            // Fill the host rather than a fixed size. Uppy writes this as an
            // inline style, so the host is what index.css controls — and the
            // host mirrors the QR square's measured height.
            height: '100%'
        });

        const syncUppyFileCount = (): void => {
            this.uppyFileCount.set(instance.getFiles().length);
        };

        instance.on('file-added', syncUppyFileCount);
        instance.on('file-removed', syncUppyFileCount);
        instance.on('cancel-all', syncUppyFileCount);

        const plugin = instance.getPlugin<ScanUploadPlugin>('ScanUpload');

        this.uppy = instance;
        this.core.set(plugin?.getCore() ?? null);

        // Setting the signal is what swaps "Connecting…" for the widget, but the
        // write lands outside a change-detection pass, so nothing would render
        // until the next unrelated tick. Rendering here keeps the two halves of
        // the card in step with each other.
        this.changeDetector.detectChanges();
    }

    /**
     * The drop zone mirrors the QR square, so the two panels read as level: it
     * starts on the square's line and is never shorter than it. Both figures are
     * published on the upload box as `--scan-height` / `--scan-offset`.
     *
     * The dashed QR square is measured rather than the whole widget — the drop
     * zone lines up with the code, not with the header above it or the reload
     * hint below.
     */
    private readonly measureScan = (): void => {
        const box = this.root.querySelector<HTMLElement>('.upload-box');
        const host = this.root.querySelector<HTMLElement>('.scan-widget');
        if (!box || !host) return;

        const square = host.querySelector<HTMLElement>('.sqg-qr-wrapper') ?? host;
        const squareBox = square.getBoundingClientRect();

        box.style.setProperty('--scan-height', `${Math.round(squareBox.height)}px`);
        box.style.setProperty('--scan-offset', `${Math.round(squareBox.top - host.getBoundingClientRect().top)}px`);

        // Re-point the observer rather than leaving it watching a detached node,
        // in case the widget ever swaps the square for a new element. It is
        // created here, on the first pass that finds a square, because the host
        // stays empty for as long as the core is missing.
        if (square !== this.observedSquare) {
            if (this.observedSquare) this.scanObserver?.unobserve(this.observedSquare);
            this.scanObserver ??= new ResizeObserver(() => this.measureScan());
            this.scanObserver.observe(square);
            this.observedSquare = square;
        }
    };
}
