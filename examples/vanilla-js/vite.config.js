import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [mkcert(), tailwindcss()],
    server: {
        port: 5174,
        open: true,
        strictPort: true,
        proxy: {
            "/api": {
                target: "https://localhost:7021",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
            "/scanupload-api": {
                target: "https://localhost:7021",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
