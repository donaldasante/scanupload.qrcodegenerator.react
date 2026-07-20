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
                sessionUrl="/scanupload-api/session"
                [showHeader]="true"
                header="Upload files from mobile device"
                size="large"
                [showLogo]="true"
                [clickQrCodeToReload]="true"
                filePreviewMode="list"
            ></sqg-qr-code-generator>
        </div>
    `
})
export class AppComponent {}
