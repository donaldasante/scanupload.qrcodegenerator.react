import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [svelte(), mkcert()],
  server: {
    port: 5176,
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
