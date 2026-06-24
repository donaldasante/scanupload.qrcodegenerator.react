import { defineConfig } from "vite";
import angular from "@analogjs/vite-plugin-angular";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    angular({
      tsconfig: resolve(__dirname, "tsconfig.json"),
    }),
    dts({
      include: ["src"],
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "QrCodeGeneratorAngular",
      formats: ["es"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        /^@angular\//,
        "rxjs",
        "rxjs/operators",
        "@scanupload/qr-code-generator-core",
        "qrcode",
        "lucide",
        "tslib",
        "zone.js",
      ],
      output: {
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
