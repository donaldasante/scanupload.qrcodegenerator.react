import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { QR_SCANNER_SVG } from '../icons';

@Component({
    selector: 'sqg-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<span [class]="cssClass" [innerHTML]="svg"></span>`
})
export class LogoComponent {
    @Input() isConnected = false;

    protected readonly svg: SafeHtml;

    constructor(sanitizer: DomSanitizer) {
        this.svg = sanitizer.bypassSecurityTrustHtml(QR_SCANNER_SVG);
    }

    protected get cssClass(): string {
        return this.isConnected ? 'sqg-logo sqg-logo--connected' : 'sqg-logo sqg-logo--disconnected';
    }
}
