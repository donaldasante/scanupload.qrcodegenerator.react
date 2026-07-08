import JSZip from 'jszip';
import { getScanUploadConfig } from './scanupload';

export type DownloadSessionResult =
    | {
          kind: 'zip';
          buffer: ArrayBuffer;
          fileName: string;
      }
    | {
          kind: 'error';
          status: number;
          message: string;
      };

export async function fetchSessionZip(sessionId: string, accessToken: string): Promise<DownloadSessionResult> {
    if (!sessionId || sessionId.trim() === '') {
        return { kind: 'error', status: 400, message: 'Session ID is required' };
    }

    const config = getScanUploadConfig();
    const downloadUrl = `${config.frontendBaseUrl}/file-management/download-session/${encodeURIComponent(sessionId)}`;

    const hubResponse = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...config.additionalHeaders
        },
        signal: AbortSignal.timeout(90000)
    });

    if (hubResponse.status === 404) {
        return {
            kind: 'error',
            status: 404,
            message: 'No files found for the given session ID'
        };
    }

    if (hubResponse.status === 409) {
        return {
            kind: 'error',
            status: 409,
            message: 'Session unavailable or already processed'
        };
    }

    if (!hubResponse.ok) {
        return { kind: 'error', status: hubResponse.status, message: 'Download failed' };
    }

    const contentType = hubResponse.headers.get('content-type') ?? '';
    const fileName = `${sessionId}.zip`;

    if (contentType.includes('application/zip') || contentType.includes('application/x-zip')) {
        const buffer = await hubResponse.arrayBuffer();
        return { kind: 'zip', buffer, fileName };
    }

    const boundaryMatch = /boundary=([^\s;,]+)/i.exec(contentType);
    if (contentType.includes('multipart/') && boundaryMatch) {
        const boundary = boundaryMatch[1].replace(/^"(.*)"$/, '$1');
        const buffer = await hubResponse.arrayBuffer();
        const zip = await buildZipFromMultipart(new Uint8Array(buffer), boundary);

        if (zip === null) {
            return {
                kind: 'error',
                status: 404,
                message: 'No files found for the given session ID'
            };
        }

        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
        return { kind: 'zip', buffer: zipBuffer, fileName };
    }

    const buffer = await hubResponse.arrayBuffer();
    if (buffer.byteLength === 0) {
        return {
            kind: 'error',
            status: 404,
            message: 'No files found for the given session ID'
        };
    }

    const zip = new JSZip();
    zip.file('download', buffer);
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return { kind: 'zip', buffer: zipBuffer, fileName };
}

async function buildZipFromMultipart(bytes: Uint8Array, boundary: string): Promise<JSZip | null> {
    const zip = new JSZip();
    const delimiter = encodeAscii(`\r\n--${boundary}`);
    const openingBoundary = encodeAscii(`--${boundary}`);

    let body = bytes;
    if (startsWith(body, openingBoundary)) {
        body = body.slice(openingBoundary.length);
        if (body[0] === 13 && body[1] === 10) body = body.slice(2);
    }

    const parts = splitBySequence(body, delimiter);
    let fileCount = 0;

    for (const part of parts) {
        const trimmed = decodeText(part.slice(0, 4));
        if (trimmed.startsWith('--')) break;

        const parsed = parseMultipartPart(part);
        if (!parsed) continue;

        const filename = extractFilename(parsed.headers) ?? `file_${++fileCount}`;
        zip.file(filename, parsed.fileBody);
    }

    if (Object.keys(zip.files).length === 0) return null;
    return zip;
}

function encodeAscii(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

function decodeText(data: Uint8Array): string {
    return new TextDecoder('utf-8', { fatal: false }).decode(data);
}

function parseMultipartPart(part: Uint8Array): { headers: string; fileBody: Uint8Array } | null {
    const stripped = part[0] === 13 && part[1] === 10 ? part.slice(2) : part;
    const sepIdx = indexOf(stripped, encodeAscii('\r\n\r\n'));
    if (sepIdx === -1) return null;

    const headers = decodeText(stripped.slice(0, sepIdx));
    const fileBody = trimTrailingCrlf(stripped.slice(sepIdx + 4));

    return { headers, fileBody };
}

function trimTrailingCrlf(fileBody: Uint8Array): Uint8Array {
    if (fileBody.length < 2) return fileBody;
    if (fileBody.at(-2) === 13 && fileBody.at(-1) === 10) {
        return fileBody.slice(0, -2);
    }
    return fileBody;
}

function startsWith(data: Uint8Array, prefix: Uint8Array): boolean {
    if (data.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
        if (data[i] !== prefix[i]) return false;
    }
    return true;
}

function indexOf(data: Uint8Array, seq: Uint8Array): number {
    outer: for (let i = 0; i <= data.length - seq.length; i++) {
        for (let j = 0; j < seq.length; j++) {
            if (data[i + j] !== seq[j]) continue outer;
        }
        return i;
    }
    return -1;
}

function splitBySequence(data: Uint8Array, sep: Uint8Array): Uint8Array[] {
    const parts: Uint8Array[] = [];
    let start = 0;
    while (start < data.length) {
        const idx = indexOf(data.slice(start), sep);
        if (idx === -1) {
            parts.push(data.slice(start));
            break;
        }
        parts.push(data.slice(start, start + idx));
        start += idx + sep.length;
    }
    return parts;
}

function extractFilename(headers: string): string | null {
    const extMatch = /content-disposition:[^\r\n]*filename\*\s*=\s*UTF-8''([^\r\n;]+)/i.exec(headers);
    if (extMatch) return decodeURIComponent(extMatch[1].trim());

    const plainMatch = /content-disposition:[^\r\n]*filename\s*=\s*"?([^"\r\n;]+)"?/i.exec(headers);
    if (plainMatch) return plainMatch[1].trim();

    return null;
}
