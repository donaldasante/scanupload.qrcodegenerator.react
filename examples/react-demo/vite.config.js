import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig(({ mode }) => {
    // Load .env so we can read VITE_HUB_API_TARGET_DEV for the dev proxy.
    // Production builds inline VITE_SESSION_URL (= "/hub-api/...") into the
    // bundle; Nginx then reverse-proxies /hub-api/* to the hub. The dev
    // server can't use a runtime nginx, so we proxy here instead.
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [react(), mkcert()],
        server: {
            port: 5173,
            open: true,
            strictPort: true,
            proxy: {
                "/hub-api": {
                    target: env.VITE_HUB_API_TARGET_DEV,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/hub-api/, ""),
                },
            },
        },
    };
});
