/**
 * Local stand-in for the backend Uppy uploads to, so the demo runs without any
 * server of your own — the Next equivalent of the `mockUploadEndpoint()` Vite
 * plugin in the other demos.
 *
 * It accepts the multipart POST that `@uppy/xhr-upload` sends and answers with
 * the JSON shape `getResponseData` in `GeneralForm.tsx` expects. Set
 * `NEXT_PUBLIC_UPLOAD_ENDPOINT` to bypass it and upload somewhere real.
 *
 * The body is buffered whole, which is fine for a demo: the point is to count
 * the bytes and confirm the upload landed. A real endpoint would stream.
 */
export async function POST(request: Request): Promise<Response> {
    const body = await request.arrayBuffer();

    return Response.json({
        url: `mock://received/${Date.now()}`,
        receivedBytes: body.byteLength,
        receivedAt: new Date().toISOString()
    });
}
