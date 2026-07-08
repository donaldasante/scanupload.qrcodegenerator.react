import { getScanUploadConfig } from './scanupload';

const BLOCKED_RESPONSE_HEADERS = new Set([
    'transfer-encoding',
    'connection',
    'keep-alive',
    'upgrade',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers'
]);

export function isTokenRequest(subPath: string, method: string): boolean {
    return subPath === 'token' && method === 'POST';
}

export function buildOutboundHeaders(incomingHeaders: Headers, accessToken: string, hasBody: boolean): Record<string, string> {
    const config = getScanUploadConfig();

    const outHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        ...config.additionalHeaders
    };

    for (const name of config.headersToForward) {
        const value = incomingHeaders.get(name);
        if (value) outHeaders[name] = value;
    }

    if (hasBody && !outHeaders['content-type']) {
        outHeaders['content-type'] = 'application/json';
    }

    return outHeaders;
}

export function buildResponseHeaders(hubResponse: Response): Headers {
    const responseHeaders = new Headers();

    for (const [key, value] of hubResponse.headers.entries()) {
        const lower = key.toLowerCase();
        if (BLOCKED_RESPONSE_HEADERS.has(lower)) continue;
        if (lower === 'content-encoding') continue;
        responseHeaders.set(key, value);
    }

    return responseHeaders;
}

export async function forwardToScanUpload(
    method: string,
    subPath: string,
    search: string,
    accessToken: string,
    incomingHeaders: Headers,
    bodyBuffer?: ArrayBuffer
): Promise<Response> {
    const config = getScanUploadConfig();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const outHeaders = buildOutboundHeaders(incomingHeaders, accessToken, hasBody);
    const targetUrl = `${config.frontendBaseUrl}/${subPath}${search}`;

    return fetch(targetUrl, {
        method,
        headers: outHeaders,
        body: bodyBuffer,
        signal: AbortSignal.timeout(90000)
    });
}
