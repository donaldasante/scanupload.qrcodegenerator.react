import QRCode from 'qrcode';
/**
 * Generate a QR code as an SVG string using the `qrcode` library.
 * Returns a placeholder SVG when `text` is falsy.
 */
export async function generateQrSvg(text, size = 200) {
    return QRCode.toString(text || 'http://localhost', {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'L'
    });
}
