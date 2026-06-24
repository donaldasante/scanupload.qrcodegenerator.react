import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'sqg-progress-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="sqg-progress-wrap">
            <div class="sqg-progress-labels">
                <span class="sqg-progress-label">Uploading...</span>
                <span class="sqg-progress-label">{{ rounded }}%</span>
            </div>
            <div class="sqg-progress-track">
                <div class="sqg-progress-fill" [style.width.%]="progress || 0"></div>
            </div>
        </div>
    `
})
export class ProgressBarComponent {
    @Input() progress = 0;

    protected get rounded(): number {
        return Math.round(this.progress || 0);
    }
}
