import type { UploadedFile } from '@scanupload/qr-code-generator-core';
import { el, escapeHtml, getFileExtension } from './domUtils';
import { getFileIconSvg, getGenericDocIconSvg } from './fileIcons';

export function renderFileGrid(container: HTMLElement, files: UploadedFile[]): void {
    container.innerHTML = '';
    container.className = 'flex flex-row justify-center gap-1 flex-wrap';

    for (const file of files) {
        const card = el('div', 'flex flex-col items-center mt-2 gap-1');
        const inner = el(
            'div',
            'group flex max-w-[160px] cursor-default flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors duration-200 hover:bg-gray-50 hover:shadow-md'
        );
        const ext = getFileExtension(file.name);

        if (file.thumbnailBase64) {
            const imgWrap = el('div', 'h-12 w-20 overflow-hidden rounded transition-transform duration-200 group-hover:scale-110');
            const img = document.createElement('img');
            img.src = `data:${file.type};base64,${file.thumbnailBase64}`;
            img.className = 'h-full w-full object-cover';
            imgWrap.appendChild(img);
            inner.appendChild(imgWrap);
        } else {
            const iconWrap = el('div', 'mb-2 transition-transform duration-200 group-hover:scale-110');
            iconWrap.innerHTML = getFileIconSvg(ext, 20);
            inner.appendChild(iconWrap);

            if (ext) {
                const badge = el('div', 'text-base px-1 text-center font-medium break-all');
                badge.innerHTML = `<span class="inline-block rounded bg-gray-100 px-2 py-0.5 text-gray-700">${escapeHtml(ext.toUpperCase())}</span>`;
                inner.appendChild(badge);
            }
        }

        // Info
        const info = el('div', 'flex flex-row items-center justify-between gap-1 p-2');
        const meta = el('div', 'mt-1');

        const name = el('p', 'w-25 truncate text-start text-xs font-medium text-gray-800');
        name.textContent = file.name;
        name.title = file.name;
        meta.appendChild(name);

        const size = el('p', 'text-start text-xs text-gray-500');
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
    container.className = 'w-full';

    const list = el('div', 'flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden');

    for (const file of files) {
        const row = el('div', 'flex items-center gap-2 p-2');

        // Thumbnail or icon
        const thumb = el('div', 'w-12 h-12 shrink-0 overflow-hidden rounded bg-gray-100 flex items-center justify-center text-gray-500');
        if (file.thumbnailBase64) {
            const img = document.createElement('img');
            img.src = `data:${file.type};base64,${file.thumbnailBase64}`;
            img.className = 'w-full h-full object-cover';
            thumb.appendChild(img);
        } else {
            thumb.innerHTML = getGenericDocIconSvg(24);
        }
        row.appendChild(thumb);

        // Info
        const info = el('div', 'flex flex-col flex-1 min-w-0');
        const nameSpan = el('span', 'text-xs font-medium text-gray-800 truncate w-60');
        nameSpan.textContent = file.name;
        nameSpan.title = file.name;
        info.appendChild(nameSpan);

        const sizeSpan = el('span', 'text-xs text-gray-500');
        sizeSpan.textContent = `${(file.size / 1024).toFixed(1)} KB`;
        info.appendChild(sizeSpan);
        row.appendChild(info);

        list.appendChild(row);
    }
    container.appendChild(list);
}

export function createProgressBar(progress: number): HTMLElement {
    const wrap = el('div', 'mt-3 w-full');
    const labels = el('div', 'mb-2 flex justify-between');
    labels.innerHTML = `<span class="text-sm font-medium text-gray-700">Uploading...</span><span class="text-sm font-medium text-gray-700">${Math.round(progress || 0)}%</span>`;
    wrap.appendChild(labels);

    const track = el('div', 'h-2.5 w-full rounded-full bg-gray-200');
    const fill = el('div', 'h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-300 ease-out');
    fill.style.width = `${progress || 0}%`;
    track.appendChild(fill);
    wrap.appendChild(track);

    return wrap;
}
