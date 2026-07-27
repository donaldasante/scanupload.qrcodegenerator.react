# @scanupload/qr-code-generator-vanilla

Framework-free wrapper for the ScanUpload QR Code Generator. `QrCodeGeneratorElement` renders into a host element, manages the session lifecycle, and updates the DOM as files are uploaded.

## Install

```bash
npm install @scanupload/qr-code-generator-vanilla
```

## Quick start

```html
<div id="widget"></div>
```

```ts
import { QrCodeGeneratorElement } from '@scanupload/qr-code-generator-vanilla';

const widget = new QrCodeGeneratorElement({
    container: document.getElementById('widget')!,
    sessionUrl: '/api/front-end/session',
    clientId: 'your-tenant-id',
    header: 'Upload files from your phone',
    showHeader: true,
    showDownloadButton: true
});

await widget.start();
```

By default the built-in stylesheet is injected into `<head>`. Set `injectStyles: false` if you'd rather import the CSS yourself.

## Options

| Option                | Type                                         | Default      | Description                                                                                                                             |
| --------------------- | -------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `container`           | `HTMLElement`                                | — (required) | Host element to render into.                                                                                                            |
| `sessionUrl`          | `string`                                     | — (required) | Endpoint that creates a ScanUpload session.                                                                                             |
| `clientId`            | `string`                                     | `undefined`  | Optional tenant / Keycloak `client_id` sent in the request body.                                                                        |
| `header`              | `string`                                     | `""`         | Header text shown when `showHeader` is `true`.                                                                                          |
| `showHeader`          | `boolean`                                    | `false`      | Render the header above the QR code.                                                                                                    |
| `showLogo`            | `boolean`                                    | `true`       | Overlay the ScanUpload logo in the centre of the QR code.                                                                               |
| `clickQrCodeToReload` | `boolean`                                    | `false`      | When `true`, clicking the QR code reloads the session.                                                                                  |
| `filePreviewMode`     | `"grid" \| "list"`                           | `"grid"`     | Display uploaded files as tiles or a compact list.                                                                                      |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"`    | Overall size of the QR code container.                                                                                                  |
| `autoResession`       | `boolean`                                    | `false`      | Create a fresh session automatically when the current one expires. By default, the disconnected state and Reload action remain visible. |
| `injectStyles`        | `boolean`                                    | `true`       | Auto-inject the built-in stylesheet into `<head>`.                                                                                      |
| `showDownloadButton`  | `boolean`                                    | `false`      | Render a "Download all files" button beneath the previews.                                                                              |

## Downloads

When `showDownloadButton` is `true`, a "Download all files" button appears beneath the previews. Clicking it iterates the live `state.uploadedFiles` and fetches each `url`, triggering a browser save for every file the hub has surfaced. A per-batch error toast is shown if any file fails.

## Styling

```ts
import '@scanupload/qr-code-generator-vanilla/dist/index.css';
import './my-overrides.css';
```

Set `injectStyles: false` when you import the CSS yourself to avoid double-injection.

See the [root README](../../README.md#css-custom-properties) for the full list of `--sqg-*` tokens.

## Lifecycle

```ts
const widget = new QrCodeGeneratorElement({
    container: document.getElementById('widget')!,
    sessionUrl: '/api/front-end/session'
});

await widget.start();

const state = widget.getState();
await widget.setOptions({ sessionUrl: '/api/new-session' });
await widget.retrySession();

widget.dispose();
```

## License

MIT Donald Asante
