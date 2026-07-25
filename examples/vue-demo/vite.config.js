import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [vue(), mkcert()],
  server: {
    port: 5174,
    open: true,
    strictPort: true,
  },
});
