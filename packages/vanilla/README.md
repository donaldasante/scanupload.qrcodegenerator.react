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
| `showFilePreviews`    | `boolean`                                    | `true`       | Render files received from the phone in the widget. Set to `false` when something else renders them.                                    |

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

## File lifecycle callbacks

Hand every file the widget receives to your own code — an uploader, an
application-owned list, or analytics. Pair them with `showFilePreviews: false`
when something else renders the files.

```ts
new QrCodeGeneratorElement({
    container: document.getElementById('qr')!,
    sessionUrl,
    showFilePreviews: false,
    onFileAvailable: (file, origin) => add(file),
    onFileRemoved: (file) => drop(file.id),
    onFilesCleared: () => dropAll()
}).start();
```

| Option            | Type                     | Default     | Description                                                              |
| ----------------- | ------------------------ | ----------- | ------------------------------------------------------------------------ |
| `onFileAvailable` | `(file, origin) => void` | `undefined` | Every file the hub is holding. `origin` is `'live'` or `'restored'`.     |
| `onFileRemoved`   | `(file) => void`         | `undefined` | The hub dropped a single file. Not called for a full clear.              |
| `onFilesCleared`  | `(files) => void`        | `undefined` | Every file was cleared at once — a session reset, or the session ending. |

Events are not replayed: a file that arrived before the element started will not
fire `onFileAvailable`. Reach for `connectScanUploadFiles` from
`@scanupload/qr-code-generator-core` when you need a guaranteed one-shot pass
over the session — that is also the tool for feeding an uploader that has no
bespoke adapter.

## License

MIT Donald Asante
