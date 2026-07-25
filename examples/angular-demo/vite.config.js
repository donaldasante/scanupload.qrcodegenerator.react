import { defineConfig } from "vite";
import angular from "@analogjs/vite-plugin-angular";
import mkcert from "vite-plugin-mkcert";
import { resolve } from "path";

export default defineConfig({
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
});
