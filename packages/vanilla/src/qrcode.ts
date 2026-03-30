import QRCode from 'qrcode';

/**
 * Generate a QR code as an SVG string using the `qrcode` library.
 * Returns an empty placeholder SVG when `text` is falsy.
 */
export async function generateQrSvg(text: string, size = 200): Promise<string> {
    if (!text) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/></svg>`;
    }

    return QRCode.toString(text, {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'L'
    });
}
