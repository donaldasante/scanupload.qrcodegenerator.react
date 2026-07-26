import { defineConfig } from "vite";
import angular from "@analogjs/vite-plugin-angular";
import mkcert from "vite-plugin-mkcert";
import { resolve } from "path";

// The bundle calls https://hub.scanupload.net/... directly (VITE_SESSION_URL
// is inlined at build time). No dev-server proxy is needed: the browser
// connects straight to the hub and the hub's CORS allowlist controls access.
export default defineConfig(() => {
    return {
        plugins: [
            angular({
                tsconfig: resolve(__dirname, "tsconfig.json"),
            }),
            mkcert(),
        ],
        server: {
            port: 5175,
            open: true,
            strictPort: true,
        },
    };
});
