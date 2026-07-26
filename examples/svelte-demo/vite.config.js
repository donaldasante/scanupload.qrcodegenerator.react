import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import mkcert from "vite-plugin-mkcert";

// The bundle calls https://hub.scanupload.net/... directly (VITE_SESSION_URL
// is inlined at build time). No dev-server proxy is needed: the browser
// connects straight to the hub and the hub's CORS allowlist controls access.
export default defineConfig(() => {
    return {
        plugins: [svelte(), mkcert()],
        server: {
            port: 5176,
            open: true,
            strictPort: true,
        },
    };
});
