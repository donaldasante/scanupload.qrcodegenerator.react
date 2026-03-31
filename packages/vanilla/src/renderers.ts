import type { UploadedFile } from '@scanupload/qr-code-generator-core';
import { el, escapeHtml, getFileExtension } from './domUtils';
import { getFileIconSvg, getGenericDocIconSvg } from './fileIcons';

export function renderFileGrid(container: HTMLElement, files: UploadedFile[]): void {
    container.innerHTML = '';
    container.className = 'sqg-file-grid';

    for (const file of files) {
        const card = el('div', 'sqg-file-card');
        const inner = el('div', 'sqg-file-inner');
        const ext = getFileExtension(file.name);

        if (file.thumbnailBase64) {
            const imgWrap = el('div', 'sqg-thumb-wrap');
            const img = document.createElement('img');
            img.src = `data:${file.type};base64,${file.thumbnailBase64}`;
            img.className = 'sqg-thumb-img';
            imgWrap.appendChild(img);
            inner.appendChild(imgWrap);
        } else {
            const iconWrap = el('div', 'sqg-icon-wrap');
            iconWrap.innerHTML = getFileIconSvg(ext, 20);
            inner.appendChild(iconWrap);

            if (ext) {
                const badge = el('div', 'sqg-ext-badge');
                badge.innerHTML = `<span>${escapeHtml(ext.toUpperCase())}</span>`;
                inner.appendChild(badge);
            }
        }

        // Info
        const info = el('div', 'sqg-file-info');
        const meta = el('div', 'sqg-file-meta');

        const name = el('p', 'sqg-file-name');
        name.textContent = file.name;
        name.title = file.name;
        meta.appendChild(name);

        const size = el('p', 'sqg-file-size');
        size.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        meta.appendChild(size);

        info.appendChild(meta);
        inner.appendChild(info);

        // Progress bar
        inner.appendChild(createProgressBar(file.progress));

        card.appendChild(inner);
        container.appendChild(card);
    }
}

export function renderFileList(container: HTMLElement, files: UploadedFile[]): void {
    container.innerHTML = '';
    container.className = 'sqg-file-list';

    const list = el('div', 'sqg-file-list-inner');

    for (const file of files) {
        const row = el('div', 'sqg-file-row');

        // Thumbnail or icon
        const thumb = el('div', 'sqg-list-thumb');
        if (file.thumbnailBase64) {
            const img = document.createElement('img');
            img.src = `data:${file.type};base64,${file.thumbnailBase64}`;
            thumb.appendChild(img);
        } else {
            thumb.innerHTML = getGenericDocIconSvg(24);
        }
        row.appendChild(thumb);

        // Info
        const info = el('div', 'sqg-list-info');
        const nameSpan = el('span', 'sqg-list-name');
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        info.appendChild(nameSpan);

        const sizeSpan = el('span', 'sqg-list-size');
        sizeSpan.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        info.appendChild(sizeSpan);
        row.appendChild(info);

        list.appendChild(row);
    }
    container.appendChild(list);
}

export function createProgressBar(progress: number): HTMLElement {
    const wrap = el('div', 'sqg-progress-wrap');
    const labels = el('div', 'sqg-progress-labels');
    labels.innerHTML = `<span class="sqg-progress-label">Uploading...</span><span class="sqg-progress-label">${Math.round(progress || 0)}%</span>`;
    wrap.appendChild(labels);

    const track = el('div', 'sqg-progress-track');
    const fill = el('div', 'sqg-progress-fill');
    fill.style.width = `${progress || 0}%`;
    track.appendChild(fill);
    wrap.appendChild(track);

    return wrap;
}
