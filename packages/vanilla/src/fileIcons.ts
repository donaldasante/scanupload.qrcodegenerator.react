import {
    createElement,
    File,
    FileText,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    FileCode,
    FileSpreadsheet,
    FileType,
    FileDigit,
    FileJson,
    Presentation,
    type IconNode
} from 'lucide';

/**
 * Create an SVG string from a Lucide icon node with the given size and color.
 */
function renderIcon(icon: IconNode, size: number, color: string): string {
    const el = createElement(icon);
    el.setAttribute('width', String(size));
    el.setAttribute('height', String(size));
    el.setAttribute('stroke', color);
    return el.outerHTML;
}

/**
 * Returns an inline SVG string for a file-type icon based on the extension.
 * Uses the same Lucide icons and colour mapping as the React DocumentPreviewer.
 */
export function getFileIconSvg(extension: string, size = 24): string {
    const ext = extension.toLowerCase();

    switch (ext) {
        // Documents
        case 'pdf':
            return renderIcon(File, size, '#ef4444');
        case 'doc':
        case 'docx':
            return renderIcon(FileText, size, '#3b82f6');
        case 'xls':
        case 'xlsx':
            return renderIcon(FileSpreadsheet, size, '#16a34a');
        case 'csv':
            return renderIcon(FileSpreadsheet, size, '#22c55e');
        case 'ppt':
        case 'pptx':
            return renderIcon(Presentation, size, '#f97316');
        case 'txt':
        case 'rtf':
            return renderIcon(FileText, size, '#4b5563');
        case 'md':
            return renderIcon(FileDigit, size, '#4b5563');

        // Images
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
        case 'bmp':
        case 'webp':
        case 'ico':
            return renderIcon(FileImage, size, '#a855f7');

        // Video
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'wmv':
        case 'flv':
        case 'webm':
        case 'mkv':
            return renderIcon(FileVideo, size, '#9333ea');

        // Audio
        case 'mp3':
        case 'wav':
        case 'ogg':
        case 'flac':
        case 'm4a':
        case 'aac':
            return renderIcon(FileAudio, size, '#ec4899');

        // Archives
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz':
        case 'bz2':
            return renderIcon(FileArchive, size, '#ca8a04');

        // Code
        case 'js':
        case 'jsx':
            return renderIcon(FileCode, size, '#eab308');
        case 'ts':
        case 'tsx':
            return renderIcon(FileType, size, '#2563eb');
        case 'html':
        case 'htm':
            return renderIcon(FileCode, size, '#ea580c');
        case 'css':
            return renderIcon(FileCode, size, '#60a5fa');
        case 'json':
            return renderIcon(FileJson, size, '#374151');
        case 'xml':
        case 'yml':
        case 'yaml':
            return renderIcon(FileCode, size, '#4b5563');

        default:
            return renderIcon(File, size, '#6b7280');
    }
}

/** Generic document icon for list-view when no thumbnail is available. */
export function getGenericDocIconSvg(size = 24): string {
    return renderIcon(File, size, '#6b7280');
}
