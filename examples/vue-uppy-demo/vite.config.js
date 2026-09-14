import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

/** Path the demo's Uppy instance uploads to. Overridable via VITE_UPLOAD_ENDPOINT. */
const MOCK_UPLOAD_PATH = "/demo-upload";

/**
 * Local stand-in for the backend Uppy uploads to, so the demo runs without any
 * server of your own. It accepts the multipart POST that `@uppy/xhr-upload`
 * sends and answers with the JSON shape `getResponseData` in `App.vue` expects.
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
        plugins: [vue(), mkcert(), mockUploadEndpoint()],
        server: {
            // Distinct from `examples/vue-demo` so both can run side by side.
            port: 5175,
            open: true,
            strictPort: true,
        },
    };
});
