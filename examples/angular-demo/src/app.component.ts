import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QrCodeGeneratorComponent } from '@scanupload/qr-code-generator-angular';

type FilePreviewMode = 'list' | 'grid';
type QrCodeSize = 'small' | 'medium' | 'large' | 'xlarge';

interface SizeOption {
    value: QrCodeSize;
    label: string;
}

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
                        <label for="checkDownloadButton" class="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                            Show download button
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
                        <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                            File preview mode
                        </div>
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
                        <div class="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                            Qr Code size
                        </div>
                        <div class="flex flex-row items-start mt-2 space-x-4">
                            <!-- items-start (not items-center) so the
                                 radio stays aligned at the top of the
                                 label, even when the label text wraps
                                 to two lines like "Extra Large". -->
                            <label *ngFor="let size of sizeOptions" class="flex items-start cursor-pointer group">
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
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-6">
                <sqg-qr-code-generator
                    [sessionUrl]="sessionUrl"
                    [clientId]="clientId"
                    [showHeader]="showHeader"
                    [header]="headerText"
                    [size]="qrCodeSize"
                    [showLogo]="showQrCodeLogo"
                    [clickQrCodeToReload]="clickQrcodeReload"
                    [filePreviewMode]="filePreviewMode"
                    [showDownloadButton]="showDownloadButton"
                ></sqg-qr-code-generator>
            </div>
        </div>
        <p class="demo-back-link">
            <a href="https://app.scanupload.net/" class="text-blue-600 hover:text-blue-800 underline">
                Back to ScanUpload
            </a>
        </p>
    `
})
export class AppComponent {
    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    protected readonly sessionUrl = import.meta.env.VITE_SESSION_URL;
    protected readonly clientId = import.meta.env.VITE_CLIENT_ID;

    protected showQrCodeLogo = true;
    protected clickQrcodeReload = true;
    protected showHeader = true;
    protected showDownloadButton = true;
    protected filePreviewMode: FilePreviewMode = 'list';
    protected headerText = 'Scan to upload';
    protected qrCodeSize: QrCodeSize = 'large';

    protected readonly sizeOptions: SizeOption[] = [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'xlarge', label: 'X-Large' }
    ];
}
