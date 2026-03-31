import QRCode from 'qrcode';

/**
 * Generate a QR code as an SVG string using the `qrcode` library.
 * Returns an empty placeholder SVG when `text` is falsy.
 */
export async function generateQrSvg(text: string, size = 200): Promise<string> {
    return QRCode.toString(text || 'http://localhost', {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'L'
    });
}
