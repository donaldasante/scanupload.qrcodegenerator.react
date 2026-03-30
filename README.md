# @scanupload/qr-code-generator

A multi-framework QR code generator that allows a mobile device to securely
upload files to a ScanUpload session. The desktop component receives real-time
status updates via a SignalR connection and renders a live preview of every
uploaded file.

The project is structured as a monorepo with a **framework-agnostic core** and
dedicated adapter packages for each UI framework.

---

## Packages

| Package                                                     | Description                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| [`@scanupload/qr-code-generator-core`](packages/core)       | Framework-agnostic runtime — SignalR session management, state, types |
| [`@scanupload/qr-code-generator-react`](packages/react)     | React wrapper — QR code component with file upload previews           |
| [`@scanupload/qr-code-generator-vanilla`](packages/vanilla) | Vanilla JS/TS headless controller                                     |

Angular and Svelte adapters are planned next — they will depend only on the core
package.

---

## Monorepo Structure

```
packages/
  core/         Framework-agnostic runtime (QrCodeGeneratorCore, types, storage adapter)
  react/        React component, hooks, and Tailwind-based UI
  vanilla/      Headless QrCodeController for vanilla JS/TS
examples/
  react-demo/   Dev demo app consuming the React package
```

## Backend Integrations

- [ScanUpload.Api.Client](https://github.com/donaldasante/scanupload.api.client) — ScanUpload backend proxy (dotnet)

---

## Installation

### Core only (for custom framework adapters)

```bash
npm install @scanupload/qr-code-generator-core
```

### React

```bash
npm install @scanupload/qr-code-generator-react
```

Peer dependencies: `react >= 19`, `react-dom >= 19`.

```ts
import { QrCodeGenerator } from '@scanupload/qr-code-generator-react';
import '@scanupload/qr-code-generator-react/dist/index.css';
```

### Vanilla JS / TypeScript

```bash
npm install @scanupload/qr-code-generator-vanilla
```

```ts
import { QrCodeController } from '@scanupload/qr-code-generator-vanilla';

const ctrl = new QrCodeController({
    sessionUrl: '/api/session',
    refreshTokenUrl: '/api/token',
    onChange(state) {
        console.log('QR URL:', state.deviceLoginUrl);
        console.log('Files:', state.uploadedFiles);
    }
});

ctrl.start();
```

---

## Development

```bash
# Install all workspace dependencies
npm install

# Build all packages (core → react → vanilla)
npm run build

# Run the React demo with hot-reload
npm run dev
```

---

## Architecture

```
QrCodeGeneratorCore (packages/core)
├── @microsoft/signalr
├── apiClient (fetch wrapper)
├── utilities (debounce, token parsing)
└── StorageAdapter (injected — defaults to browser localStorage)

React adapter (packages/react)
├── useQrCodeCore hook → wraps Core via useSyncExternalStore
├── QrCodeGenerator component (Tailwind UI)
└── File preview components

Vanilla adapter (packages/vanilla)
└── QrCodeController → wraps Core with onChange callback
```

The core never imports React, Angular, or any framework code. Framework packages
inject platform-specific dependencies (like storage) through the
`StorageAdapter` interface.

---

## Creating a New Framework Adapter

1. Create `packages/<framework>/`
2. Depend on `@scanupload/qr-code-generator-core`
3. Instantiate `QrCodeGeneratorCore` with your framework's storage adapter
4. Wire `subscribe()` / `getState()` to your framework's reactivity model
5. Build your UI on top of the state
   showHeader={true}
   header="Upload files from mobile device"
   size="large"
   showLogo={true}
   clickQrCodeToReload={true}
   filePreviewMode="list"
   classNames={{
               qrWrapper: "rounded-none border-solid border-blue-500",
               reloadButton: "bg-red-500 hover:bg-red-700",
               header: "text-2xl font-bold text-purple-700",
             }}
   />
   </form>
   </div>
   );
   }

````

---

## Props Reference

| Prop                  | Type                                         | Default   | Required | Description                                                                                                                                 |
| --------------------- | -------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionUrl`          | `string`                                     | —         | ✅       | URL of the endpoint that creates a ScanUpload session (`POST`).                                                                             |
| `refreshTokenUrl`     | `string`                                     | —         | ✅       | URL of the endpoint that returns a fresh Bearer token (`POST`).                                                                             |
| `header`              | `string`                                     | —         | ✅       | Text rendered in the header element (visible only when `showHeader` is `true`).                                                             |
| `showHeader`          | `boolean`                                    | `false`   |          | Whether to render the header above the QR code.                                                                                             |
| `showLogo`            | `boolean`                                    | `true`    |          | Whether to overlay the ScanUpload logo in the centre of the QR code.                                                                        |
| `clickQrCodeToReload` | `boolean`                                    | `false`   |          | When `true`, clicking the QR code triggers a session reload. When `false`, a separate _Reload_ button is shown beneath the QR code instead. |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"` |          | Controls the overall size of the QR code container.                                                                                         |
| `filePreviewMode`     | `"list" \| "grid"`                           | `"grid"`  |          | How uploaded files are displayed — as a grid of document tiles or a compact list.                                                           |
| `classNames`          | `QrCodeClassNames`                           | `{}`      |          | Slot-based Tailwind class overrides. See [classNames Customisation](#classnames-customisation).                                             |
| `style`               | `React.CSSProperties`                        | —         |          | Inline styles applied to the root `<section>`. Useful for injecting CSS custom properties.                                                  |

---

## classNames Customisation

Each key targets a specific UI region. Classes are merged with the built-in
defaults using **tailwind-merge**, so any Tailwind conflicts are always resolved
in favour of the override you supply.

| Key              | Element     | Description                                                                |
| ---------------- | ----------- | -------------------------------------------------------------------------- |
| `root`           | `<section>` | Outermost wrapper of the component.                                        |
| `loadingOverlay` | `<div>`     | Spinner overlay shown while the session is being created.                  |
| `errorOverlay`   | `<div>`     | Overlay shown when the session could not be created.                       |
| `errorButton`    | `<button>`  | Retry button inside the error overlay.                                     |
| `header`         | `<h1>`      | The header text element.                                                   |
| `qrWrapper`      | `<div>`     | Bordered box that wraps the QR code.                                       |
| `reloadButton`   | `<button>`  | Reload button shown when `clickQrCodeToReload` is `false`.                 |
| `hintText`       | `<p>`       | "Click QR code to reload" hint shown when `clickQrCodeToReload` is `true`. |
| `fileContainer`  | `<div>`     | Container for the file grid or list.                                       |

### Example

```tsx
<QrCodeGenerator
  classNames={{
    qrWrapper: "rounded-none border-solid border-blue-500",
    reloadButton: "bg-red-500 hover:bg-red-700",
    header: "text-2xl font-bold text-purple-700",
  }}
  ...
/>
````

### CSS custom properties

Use `style` to inject design tokens:

```tsx
<QrCodeGenerator
  style={{
    "--qr-accent": "#1d4ed8",
    "--qr-border": "#d1d5db",
  } as React.CSSProperties}
  ...
/>
```

---

## File Preview Modes

### `"grid"` (default)

Renders each file as a `DocumentPreviewer` tile with:

- A file-type icon colour-coded by extension (PDF → red, Word → blue, Excel →
  green, images → purple, etc.)
- A thumbnail for image files (when `thumbnailBase64` is provided by the server)
- An upload progress bar

### `"list"`

Renders all files as a compact `FileList` with:

- A 48 × 48 thumbnail (or a generic document icon if no thumbnail is available)
- File name (truncated) and size in KB

---

## License

MIT © Donald Asante
