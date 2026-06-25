/**
 * Returns an inline SVG string for a file-type icon based on the extension.
 * Uses the same Lucide icons and colour mapping as the React DocumentPreviewer.
 */
export declare function getFileIconSvg(extension: string, size?: number): string;
/** Generic document icon for list-view when no thumbnail is available. */
export declare function getGenericDocIconSvg(size?: number): string;
/** Extract the lowercase file extension from a file name. */
export declare function getFileExtension(filename: string): string;
