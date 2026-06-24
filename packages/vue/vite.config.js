import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ["src"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "QrCodeGeneratorVue",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["vue", "@scanupload/qr-code-generator-core"],
      output: {
        globals: {
          vue: "Vue",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) return "index.css";
          return assetInfo.name;
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
