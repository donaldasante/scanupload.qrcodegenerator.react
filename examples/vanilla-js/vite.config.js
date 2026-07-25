import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
    plugins: [mkcert()],
    server: {
        port: 5174,
        open: true,
        strictPort: true,
    },
});

