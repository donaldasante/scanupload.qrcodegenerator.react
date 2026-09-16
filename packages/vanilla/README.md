# @scanupload/qr-code-generator-vanilla

Framework-free wrapper for the ScanUpload QR Code Generator.
`QrCodeGeneratorElement` renders into a host element, manages the session
lifecycle, and updates the DOM as files are uploaded.

## Install

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
  sessionUrl: "/api/front-end/session",
  clientId: "your-client-id",
  header: "Upload files from your phone",
  showHeader: true,
  showDownloadButton: true,
});

await widget.start();
```

By default the built-in stylesheet is injected into `<head>`. Set
`injectStyles: false` if you'd rather import the CSS yourself.

## Get a client ID

The `clientId` option identifies your tenant. Create it in the ScanUpload
Dashboard:

1. Log in or sign up to the
   [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any
client-side env file. The browser only needs the client ID.

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
| `showFilePreviews`    | `boolean`                                    | `true`       | Render files received from the phone in the widget. Set to `false` when something else renders them.                                    |

## Downloads

Set `showDownloadButton` to render a "Download all files" button beneath the
previews. It fetches every `UploadedFile.url` the hub has surfaced and saves
each file, showing an error toast if any fail.

## Lifecycle

```ts
const widget = new QrCodeGeneratorElement({
  container: document.getElementById("widget")!,
  sessionUrl: "/api/front-end/session",
});

await widget.start();

const state = widget.getState();
await widget.setOptions({ sessionUrl: "/api/new-session" });
await widget.retrySession();

widget.dispose();
```

## Handling files elsewhere

Set `showFilePreviews: false` and use the lifecycle callbacks when something
else renders the files — an uploader, your own list, or analytics:

```ts
new QrCodeGeneratorElement({
  container: document.getElementById("qr")!,
  sessionUrl,
  showFilePreviews: false,
  onFileAvailable: (file, origin) => add(file),
  onFileRemoved: (file) => drop(file.id),
  onFilesCleared: () => dropAll(),
}).start();
```

| Option            | Type                     | Description                                                          |
| ----------------- | ------------------------ | -------------------------------------------------------------------- |
| `onFileAvailable` | `(file, origin) => void` | Every file the hub is holding. `origin` is `'live'` or `'restored'`. |
| `onFileRemoved`   | `(file) => void`         | The hub dropped a single file. Not called for a full clear.          |
| `onFilesCleared`  | `(files) => void`        | Every file was cleared at once.                                      |

Events are not replayed, so a file that arrived before the element started will
not fire `onFileAvailable`. For a guaranteed one-shot pass over the session — or
to feed an uploader with no bespoke adapter — use `connectScanUploadFiles` from
[`@scanupload/qr-code-generator-core`](../core#feeding-another-uploader).

## Styling

The built-in stylesheet is injected into `<head>` by default. Set
`injectStyles: false` when you import the CSS yourself to avoid
double-injection, and import your overrides **after** it.

```ts
import "@scanupload/qr-code-generator-vanilla/dist/index.css";
import "./my-overrides.css";
```

See the [root README](../../README.md#css-custom-properties) for the full list
of `--sqg-*` tokens.

## License

MIT Donald Asante
