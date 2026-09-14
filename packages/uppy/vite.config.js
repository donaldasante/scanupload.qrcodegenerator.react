import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

// `@uppy/core` v6 is ESM-only, so this package only emits an ES build.
// Shipping a CJS artifact would produce an unusable `require('@uppy/core')`.
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
      name: "QrCodeGeneratorUppy",
      formats: ["es"],
      fileName: () => "index.es.js",
    },
    rollupOptions: {
      external: ["@uppy/core", "@scanupload/qr-code-generator-core"],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
