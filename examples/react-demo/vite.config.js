import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [react(), tailwindcss(), mkcert()],
  server: {
    port: 5173,
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
