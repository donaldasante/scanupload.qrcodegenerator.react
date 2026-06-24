import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { UploadedFile } from '@scanupload/qr-code-generator-core';
import { getGenericDocIconSvg } from '../file-icons';

@Component({
    selector: 'sqg-file-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sqg-file-list">
            <div class="sqg-file-list-inner">
                @for (file of files; track file.id) {
                    <div class="sqg-file-row">
                        <div class="sqg-list-thumb">
                            @if (file.thumbnailBase64) {
                                <img [src]="'data:' + file.type + ';base64,' + file.thumbnailBase64" [alt]="file.name" />
                            } @else {
                                <span [innerHTML]="docIcon"></span>
                            }
                        </div>
                        <div class="sqg-list-info">
                            <span class="sqg-list-name" [title]="file.name">{{ file.name }}</span>
                            <span class="sqg-list-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                        </div>
                    </div>
                }
            </div>
        </div>
    `
})
export class FileListComponent {
    @Input() files: UploadedFile[] = [];

    protected readonly docIcon: SafeHtml;

    constructor(sanitizer: DomSanitizer) {
        this.docIcon = sanitizer.bypassSecurityTrustHtml(getGenericDocIconSvg(24));
    }
}
