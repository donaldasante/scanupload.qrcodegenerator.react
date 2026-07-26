import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

// The bundle calls https://hub.scanupload.net/... directly (VITE_SESSION_URL
// is inlined at build time). No dev-server proxy is needed: the browser
// connects straight to the hub and the hub's CORS allowlist controls access.
export default defineConfig(() => {
    return {
        plugins: [vue(), mkcert()],
        server: {
            port: 5174,
            open: true,
            strictPort: true,
        },
    };
});
