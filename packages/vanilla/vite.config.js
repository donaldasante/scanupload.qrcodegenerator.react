import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "QrCodeGeneratorVanilla",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["@scanupload/qr-code-generator-core"],
      output: {
        assetFileNames: (info) => info.name?.endsWith('.css') ? 'index.css' : (info.name ?? 'asset'),
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
