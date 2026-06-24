import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { UploadedFile } from '@scanupload/qr-code-generator-core';
import { getFileExtension, getFileIconSvg } from '../file-icons';
import { REMOVE_SVG } from '../icons';
import { ProgressBarComponent } from './progress-bar.component';

@Component({
    selector: 'sqg-document-previewer',
    standalone: true,
    imports: [ProgressBarComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sqg-file-card">
            <div class="sqg-file-inner">
                @if (file.thumbnailBase64) {
                    <div class="sqg-thumb-wrap">
                        <img [src]="'data:' + file.type + ';base64,' + file.thumbnailBase64" class="sqg-thumb-img" [alt]="file.name" />
                    </div>
                } @else {
                    <div class="sqg-icon-wrap" [attr.data-filetype]="extension" [innerHTML]="iconSvg"></div>
                    @if (showExtension && extension) {
                        <div class="sqg-ext-badge">
                            <span>{{ extension.toUpperCase() }}</span>
                        </div>
                    }
                }
                <div class="sqg-file-info">
                    <div class="sqg-file-meta">
                        <p class="sqg-file-name" [title]="file.name">{{ file.name }}</p>
                        <p class="sqg-file-size">({{ (file.size / 1024).toFixed(1) }} KB)</p>
                    </div>
                    @if (showRemoveButton) {
                        <button
                            class="sqg-remove-btn"
                            aria-label="Remove File"
                            [innerHTML]="removeIcon"
                            (click)="removeFile.emit(file.id)"
                        ></button>
                    }
                </div>
                <sqg-progress-bar [progress]="file.progress"></sqg-progress-bar>
            </div>
        </div>
    `
})
export class DocumentPreviewerComponent {
    @Input({ required: true }) file!: UploadedFile;
    @Input() showExtension = true;
    @Input() showRemoveButton = false;
    @Output() removeFile = new EventEmitter<string>();

    protected readonly removeIcon: SafeHtml;

    constructor(private readonly sanitizer: DomSanitizer) {
        this.removeIcon = sanitizer.bypassSecurityTrustHtml(REMOVE_SVG);
    }

    protected get extension(): string {
        return getFileExtension(this.file.name);
    }

    protected get iconSvg(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(getFileIconSvg(this.extension, 40));
    }
}
