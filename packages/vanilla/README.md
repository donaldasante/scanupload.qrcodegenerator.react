# @scanupload/qr-code-generator-vanilla

Vanilla JavaScript and TypeScript wrapper for the ScanUpload QR Code Generator.
It provides a self-contained `QrCodeGeneratorElement` that renders into a host
element, manages the session lifecycle, and updates the DOM as files are
uploaded.

## Installation

```bash
npm install @scanupload/qr-code-generator-vanilla
```

## Quick start

```html
<div id="widget"></div>
```

```ts
import { QrCodeGeneratorElement } from "@scanupload/qr-code-generator-vanilla";

const widget = new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
});

await widget.start();
```

## Backend contract

Your backend must expose two endpoints:

| Endpoint          | Method | Description                                                                                   |
| ----------------- | ------ | --------------------------------------------------------------------------------------------- |
| `sessionUrl`      | `POST` | Creates a ScanUpload session and returns `{ sessionId, accessToken, hubUrl, deviceLoginUrl }` |
| `refreshTokenUrl` | `POST` | Returns a fresh Bearer token `{ access_token, expires_in }`                                   |

## Options

| Option                | Type          | Default  | Required | Description                                                          |
| --------------------- | ------------- | -------- | -------- | -------------------------------------------------------------------- | ----------------------------------------- | --- | ------------------------- |
| `container`           | `HTMLElement` | —        | Yes      | Host element to render into.                                         |
| `sessionUrl`          | `string`      | —        | Yes      | Endpoint that creates a ScanUpload session.                          |
| `refreshTokenUrl`     | `string`      | —        | Yes      | Endpoint that refreshes the access token.                            |
| `header`              | `string`      | —        | No       | Header text shown when `showHeader` is enabled.                      |
| `showHeader`          | `boolean`     | `false`  | No       | Whether to render the header.                                        |
| `showLogo`            | `boolean`     | `true`   | No       | Whether to overlay the logo in the QR code.                          |
| `clickQrCodeToReload` | `boolean`     | `false`  | No       | Reload by clicking the QR code instead of rendering a reload button. |
| `filePreviewMode`     | `"grid"       | "list"`  | `"grid"` | No                                                                   | Display files as tiles or a compact list. |
| `size`                | `"small"      | "medium" | "large"  | "xlarge"`                                                            | `"large"`                                 | No  | Controls the widget size. |
| `injectStyles`        | `boolean`     | `true`   | No       | Auto-inject the built-in stylesheet into `head`.                     |

## Styling

### Zero-config mode

By default, the package injects its built-in CSS automatically. You do not need
to import a stylesheet.

```ts
new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
  injectStyles: true,
}).start();
```

### Manual CSS import

If you want predictable override order, disable style injection and import the
package CSS yourself.

```ts
import { QrCodeGeneratorElement } from "@scanupload/qr-code-generator-vanilla";
import "@scanupload/qr-code-generator-vanilla/dist/index.css";
import "./my-overrides.css";

new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
  injectStyles: false,
}).start();
```

```css
.sqg-root {
  border-radius: 1rem;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.sqg-spinner {
  border-top-color: #1e3a5f;
}

.sqg-error-text {
  color: #dc2626;
}
```

## Lifecycle

```ts
const widget = new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/session",
  refreshTokenUrl: "/api/token",
});

await widget.start();

const state = widget.getState();
await widget.retrySession();

widget.dispose();
```

## File preview modes

### `grid`

Shows each uploaded file as a tile with an icon or thumbnail and progress
information.

### `list`

Shows a compact file list with a thumbnail or icon, file name, and size.

## License

MIT © Donald Asante
