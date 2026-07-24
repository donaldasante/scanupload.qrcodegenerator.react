import { Component } from '@angular/core';
import { QrCodeGeneratorComponent } from '@scanupload/qr-code-generator-angular';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [QrCodeGeneratorComponent],
    template: `
        <div class="demo-card">
            <h2 class="demo-title">Angular Demo</h2>
            <sqg-qr-code-generator
                [sessionUrl]="sessionUrl"
                [clientId]="clientId"
                [showHeader]="true"
                header="Upload files from mobile device"
                size="large"
                [showLogo]="true"
                [clickQrCodeToReload]="true"
                filePreviewMode="list"
                [showDownloadButton]="true"
            ></sqg-qr-code-generator>
        </div>
    `
})
export class AppComponent {
    // Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
    protected readonly sessionUrl = import.meta.env.VITE_SESSION_URL;
    protected readonly clientId = import.meta.env.VITE_CLIENT_ID;
}
