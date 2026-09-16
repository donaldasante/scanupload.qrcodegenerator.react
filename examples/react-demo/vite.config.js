import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

/** Path the demo's Uppy instance uploads to. Overridable via VITE_UPLOAD_ENDPOINT. */
const MOCK_UPLOAD_PATH = "/demo-upload";

/**
 * Local stand-in for the backend Uppy uploads to, so the demo runs without any
 * server of your own. It accepts the multipart POST that `@uppy/xhr-upload`
 * sends and answers with the JSON shape `getResponseData` in `main.tsx` expects.
 *
 * Set `VITE_UPLOAD_ENDPOINT` to bypass it entirely and upload somewhere real.
 */
function mockUploadEndpoint() {
    const handler = (req, res) => {
        if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
        }

        let receivedBytes = 0;
        req.on("data", (chunk) => {
            receivedBytes += chunk.length;
        });
        req.on("end", () => {
            res.setHeader("content-type", "application/json");
            res.end(
                JSON.stringify({
                    url: `mock://received/${Date.now()}`,
                    receivedBytes,
                    receivedAt: new Date().toISOString(),
                }),
            );
        });
    };

    return {
        name: "scanupload-demo-mock-upload",
        configureServer(server) {
            server.middlewares.use(MOCK_UPLOAD_PATH, handler);
        },
        configurePreviewServer(server) {
            server.middlewares.use(MOCK_UPLOAD_PATH, handler);
        },
    };
}

// The bundle calls the ScanUpload hub directly (VITE_SESSION_URL is inlined at
// build time), so no dev-server proxy is needed: the browser connects straight
// to the hub and the hub's CORS allowlist controls access.
export default defineConfig(() => {
    return {
        plugins: [react(), mkcert(), mockUploadEndpoint()],
        server: {
            // One port per demo: 5174 vanilla-js, 5175 angular-demo,
            // 5176 svelte-demo, 5177 vue-demo.
            port: 5173,
            open: true,
            strictPort: true,
        },
    };
});
