import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import mkcert from "vite-plugin-mkcert";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert(),
    dts({
      include: ["src-qr-code"],
      insertTypesEntry: true,
    }),
  ],
  // Root-level options
  build: {
    lib: {
      entry: resolve(__dirname, "src-qr-code/index.ts"),
      name: "QrCodeGenerator",
      formats: ["es", "cjs"],
      fileName: (format) => `qr-code-generator.${format}.js`,
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        // Ensure CSS is extracted to a separate file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "index.css") return "index.css";
          return assetInfo.name;
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  // Server options
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
