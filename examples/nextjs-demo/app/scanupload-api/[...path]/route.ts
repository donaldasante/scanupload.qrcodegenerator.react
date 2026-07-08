import { NextRequest, NextResponse } from 'next/server';
import { buildResponseHeaders, forwardToScanUpload, getAccessToken, isTokenRequest } from '@scanupload/qr-code-generator-nextjs-server';

async function handleRequest(req: NextRequest, params: { path: string[] }): Promise<NextResponse> {
    const subPath = params.path.join('/');
    const ts = new Date().toISOString();

    try {
        if (isTokenRequest(subPath, req.method)) {
            const { access_token, expires_in } = await getAccessToken();
            return NextResponse.json({ access_token, expires_in });
        }

        const { access_token } = await getAccessToken();

        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;

        const hubResponse = await forwardToScanUpload(req.method, subPath, req.nextUrl.search, access_token, req.headers, bodyBuffer);

        const responseHeaders = buildResponseHeaders(hubResponse);

        return new NextResponse(hubResponse.body, {
            status: hubResponse.status,
            statusText: hubResponse.statusText,
            headers: responseHeaders
        });
    } catch (err) {
        console.error(`[${ts}] [proxy] error`, err);
        const message = err instanceof Error ? err.message : 'Proxy error';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(req, await params);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(req, await params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(req, await params);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(req, await params);
}
