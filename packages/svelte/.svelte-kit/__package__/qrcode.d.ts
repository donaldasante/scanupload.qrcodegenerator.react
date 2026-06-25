/**
 * Generate a QR code as an SVG string using the `qrcode` library.
 * Returns a placeholder SVG when `text` is falsy.
 */
export declare function generateQrSvg(text: string, size?: number): Promise<string>;
