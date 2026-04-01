# @scanupload/qr-code-generator

A multi-framework QR code generator that allows a mobile device to securely
upload files to a ScanUpload session. The desktop component receives real-time
status updates via a SignalR connection and renders a live preview of every
uploaded file.

The project is a **monorepo** with a framework-agnostic core and dedicated
adapter packages for React and Vanilla JS/TS.

---

## Repository Structure

```
packages/
  core/       Framework-agnostic runtime — SignalR, session management, state, types
  react/      React component, hooks, and Tailwind-based UI
  vanilla/    QrCodeGeneratorElement for Vanilla JS/TS with built-in DOM rendering
examples/
  react-demo/   Vite + React dev app
  vanilla-js/   Vite + Vanilla TS dev app
```

---

## Packages

| Package                                                     | Description                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`@scanupload/qr-code-generator-core`](packages/core)       | Framework-agnostic runtime — SignalR session management, state, types         |
| [`@scanupload/qr-code-generator-react`](packages/react)     | React `<QrCodeGenerator>` component with semantic CSS UI and file previews    |
| [`@scanupload/qr-code-generator-vanilla`](packages/vanilla) | `QrCodeGeneratorElement` — self-contained DOM renderer, no framework required |

---

## Architecture

```
QrCodeGeneratorCore (packages/core)
├── @microsoft/signalr      — real-time hub connection
├── apiClient               — session + token fetch wrapper
├── utilities               — debounce, token parsing
└── StorageAdapter          — injected; defaults to localStorage

React adapter (packages/react)
├── useQrCodeCore           — useSyncExternalStore wrapper around Core
├── QrCodeGenerator         — semantic CSS component (props-driven)
└── DocumentPreviewer, FileList, ProgressBar, Logo

Vanilla adapter (packages/vanilla)
├── QrCodeGeneratorElement  — builds and manages its own DOM subtree
└── generateQrSvg           — qrcode → inline SVG helper
```

The core never imports React or any other framework. Framework adapters depend
on core and inject platform-specific storage through the `StorageAdapter`
interface.

---

## Backend Integration

- [ScanUpload.Api.Client](https://github.com/donaldasante/scanupload.api.client)
  — ScanUpload backend proxy (.NET)

The component needs two backend endpoints:

| Endpoint          | Method | Description                                                                                   |
| ----------------- | ------ | --------------------------------------------------------------------------------------------- |
| `sessionUrl`      | `POST` | Creates a ScanUpload session and returns `{ sessionId, accessToken, hubUrl, deviceLoginUrl }` |
| `refreshTokenUrl` | `POST` | Returns a fresh Bearer token `{ access_token, expires_in }`                                   |

---

## Installation

### React

```bash
npm install @scanupload/qr-code-generator-react
```

Peer dependencies: `react >= 19`, `react-dom >= 19`.

```tsx
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import "@scanupload/qr-code-generator-react/dist/index.css";

<QrCodeGenerator sessionUrl="/api/session" refreshTokenUrl="/api/token" />;
```

**Custom CSS / overrides**

The package ships a `dist/index.css` containing all `.sqg-*` rules and CSS
custom properties. Import your overrides **after** the package CSS so
same-specificity rules win via cascade:

```tsx
import "@scanupload/qr-code-generator-react/dist/index.css"; // base styles
import "./my-overrides.css"; // your overrides
```

```css
/* my-overrides.css */
:root {
  --sqg-primary: #6366f1; /* spinner, connected logo, retry button */
  --sqg-border-radius: 1rem; /* root + qr wrapper corners */
  --sqg-error-color: #e11d48; /* error text and disconnected logo */
}

/* Or target specific elements directly */
.sqg-root {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}
```

You can also use the `classNames` or `style` props for per-instance overrides
(see [classNames Customisation](#classnames-customisation) below).

### Vanilla JS / TypeScript

```bash
npm install @scanupload/qr-code-generator-vanilla
```

```html
<div id="widget"></div>
```

**Zero-config (styles auto-injected)**

```ts
import { QrCodeGeneratorElement } from "@scanupload/qr-code-generator-vanilla";

new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
  // injectStyles defaults to true
}).start();
```

Styles are injected automatically into `<head>` — no CSS import required.

**Custom CSS / overrides**

The package ships a `dist/index.css` file containing all `.sqg-*` styles. To
override them, disable auto-injection and import the stylesheet yourself so your
overrides cascade correctly:

```ts
import { QrCodeGeneratorElement } from "@scanupload/qr-code-generator-vanilla";
import "@scanupload/qr-code-generator-vanilla/dist/index.css"; // base styles
import "./my-overrides.css"; // your overrides

new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
  injectStyles: false, // prevents double-injection
}).start();
```

`my-overrides.css` example:

```css
/* Change the QR wrapper border */
.sqg-root {
  border-radius: 1rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

/* Accent colour for the spinner */
.sqg-spinner {
  border-top-color: #6366f1;
}

/* Connected logo state */
.sqg-logo--connected {
  background: #22c55e;
}

/* Error text */
.sqg-error-text {
  color: #e11d48;
}
```

Import order is what matters — your file must come **after** the package CSS so
same-specificity rules win by cascade. No `!important` needed.

### Core only (custom framework adapters)

```bash
npm install @scanupload/qr-code-generator-core
```

---

## Development

```bash
# Install all workspace dependencies
npm install

# Build all packages in dependency order (core → react → vanilla)
npm run build

# Build individual packages
npm run build:core
npm run build:react
npm run build:vanilla

# Run the dev examples (rebuilding packages first is recommended)
npm run build ; npm run dev:react
npm run build ; npm run dev:vanilla
```

> The examples resolve packages from their local `dist/` folder. Always rebuild
> after changing any package source.

---

## React Props Reference

| Prop                  | Type                                         | Default   | Required | Description                                                                                            |
| --------------------- | -------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `sessionUrl`          | `string`                                     | —         | ✅       | Endpoint that creates a ScanUpload session (`POST`).                                                   |
| `refreshTokenUrl`     | `string`                                     | —         | ✅       | Endpoint that returns a fresh Bearer token (`POST`).                                                   |
| `header`              | `string`                                     | —         |          | Text shown in the header (visible only when `showHeader` is `true`).                                   |
| `showHeader`          | `boolean`                                    | `false`   |          | Whether to render the header above the QR code.                                                        |
| `showLogo`            | `boolean`                                    | `true`    |          | Whether to overlay the ScanUpload logo in the centre of the QR code.                                   |
| `clickQrCodeToReload` | `boolean`                                    | `false`   |          | When `true`, clicking the QR code reloads the session. When `false`, a Reload button is shown instead. |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"` |          | Overall size of the QR code container.                                                                 |
| `filePreviewMode`     | `"list" \| "grid"`                           | `"grid"`  |          | Display uploaded files as a grid of tiles or a compact list.                                           |

---

## Vanilla JS Options Reference

`QrCodeGeneratorElement` accepts all of the same options as the React component
(minus `classNames` and `style`), plus:

| Option         | Type          | Default | Required | Description                                                                                             |
| -------------- | ------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `container`    | `HTMLElement` | —       | ✅       | Host element to render the widget into.                                                                 |
| `injectStyles` | `boolean`     | `true`  |          | Automatically inject the built-in stylesheet into `<head>`. Set to `false` when importing CSS manually. |

---

````

---

## CSS Custom Properties (React & Vanilla)

Both packages share the same `--sqg-*` token names. Setting them once on `:root`
themes both widgets simultaneously.

| Token                 | Default                  | Affects                                       |
| --------------------- | ------------------------ | --------------------------------------------- |
| `--sqg-primary`       | `#1e3a5f`                | Spinner ring, connected logo, retry button bg |
| `--sqg-error-color`   | `#dc2626`                | Error overlay text, disconnected logo         |
| `--sqg-border-color`  | `#e5e7eb`                | QR wrapper border, file card border           |
| `--sqg-border-radius` | `0.75rem`                | Root wrapper and QR code box corners          |
| `--sqg-bg`            | `#ffffff`                | Component background                          |
| `--sqg-overlay-bg`    | `rgba(255,255,255,0.85)` | Loading / error overlay background            |
| `--sqg-text-color`    | `#111827`                | Header, file names, general text              |
| `--sqg-subtext-color` | `#6b7280`                | Hint text, file sizes                         |
| `--sqg-spinner-size`  | `2.5rem`                 | Width and height of the loading spinner       |
| `--sqg-spinner-width` | `3px`                    | Spinner ring stroke width                     |

---

## Creating a New Framework Adapter

1. Create `packages/<framework>/` and add `@scanupload/qr-code-generator-core` as a dependency.
2. Instantiate `QrCodeGeneratorCore` with a `StorageAdapter` for your platform.
3. Wire `subscribe()` and `getState()` to your framework's reactivity model.
4. Build your UI using the `QrCodeGeneratorState` shape.

### CSS custom properties

Use `style` to inject design tokens per-instance:

```tsx
<QrCodeGenerator
    sessionUrl='/api/session'
    refreshTokenUrl='/api/token'
/>
````

See the full token list in
[CSS Custom Properties](#css-custom-properties-react--vanilla).

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
