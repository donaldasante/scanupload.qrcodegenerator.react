# @scanupload/qr-code-generator-react

React component wrapper for the ScanUpload QR Code Generator. Renders a QR code,
manages the live upload session over SignalR, and shows uploaded-file previews.

## Install

```bash
npm install @scanupload/qr-code-generator-react
```

Peer dependencies: `react >= 19`, `react-dom >= 19`.

## Quick start

```tsx
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import "@scanupload/qr-code-generator-react/dist/index.css";

export function UploadWidget() {
  return (
    <QrCodeGenerator
      sessionUrl="/api/front-end/session"
      clientId="your-client-id"
      header="Upload files from your phone"
      showHeader
      showDownloadButton
    />
  );
}
```

## Get a client ID

The `clientId` prop identifies your tenant. Create it in the ScanUpload
Dashboard:

1. Log in or sign up to the
   [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any
client-side env file. The browser only needs the client ID.

## Props

| Prop                  | Type                                         | Default      | Description                                                                                                                             |
| --------------------- | -------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionUrl`          | `string`                                     | — (required) | Endpoint that creates a ScanUpload session.                                                                                             |
| `clientId`            | `string`                                     | `undefined`  | Optional tenant / Keycloak `client_id` sent in the request body.                                                                        |
| `header`              | `string`                                     | `""`         | Header text shown when `showHeader` is `true`.                                                                                          |
| `showHeader`          | `boolean`                                    | `false`      | Render the header above the QR code.                                                                                                    |
| `showLogo`            | `boolean`                                    | `true`       | Overlay the ScanUpload logo in the centre of the QR code.                                                                               |
| `clickQrCodeToReload` | `boolean`                                    | `false`      | When `true`, clicking the QR code reloads the session.                                                                                  |
| `filePreviewMode`     | `"grid" \| "list"`                           | `"grid"`     | Display uploaded files as tiles or a compact list.                                                                                      |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"`    | Overall size of the QR code container.                                                                                                  |
| `autoResession`       | `boolean`                                    | `false`      | Create a fresh session automatically when the current one expires. By default, the disconnected state and Reload action remain visible. |
| `showDownloadButton`  | `boolean`                                    | `false`      | Show a "Download all files" button that fetches every `UploadedFile.url` and triggers a browser save.                                   |
| `showFilePreviews`    | `boolean`                                    | `true`       | Render files received from the phone in the widget. Set to `false` when something else renders them.                                    |

## Downloads

Set `showDownloadButton` to render a "Download all files" button beneath the
previews. It fetches every `UploadedFile.url` the hub has surfaced and saves
each file, showing an error toast if any fail.

`DownloadButton` is exported separately if you want it on its own:

```tsx
import { DownloadButton } from "@scanupload/qr-code-generator-react";

<DownloadButton core={core} label="Save all" />;
```

## Handling files elsewhere

Set `showFilePreviews={false}` and use the lifecycle callbacks when something
else renders the files — an uploader, your own list, or analytics:

```tsx
<QrCodeGenerator
  sessionUrl={sessionUrl}
  showFilePreviews={false}
  onFileAvailable={(file, origin) => add(file)}
  onFileRemoved={(file) => drop(file.id)}
  onFilesCleared={() => dropAll()}
/>
```

| Prop              | Type                     | Description                                                          |
| ----------------- | ------------------------ | -------------------------------------------------------------------- |
| `onFileAvailable` | `(file, origin) => void` | Every file the hub is holding. `origin` is `'live'` or `'restored'`. |
| `onFileRemoved`   | `(file) => void`         | The hub dropped a single file. Not called for a full clear.          |
| `onFilesCleared`  | `(files) => void`        | Every file was cleared at once.                                      |

Events are not replayed, so a file that arrived before the widget mounted will
not fire `onFileAvailable`. For a guaranteed one-shot pass over the session — or
to feed an uploader with no bespoke adapter — use `connectScanUploadFiles` from
[`@scanupload/qr-code-generator-core`](../core#feeding-another-uploader).

## Styling

The package ships `dist/index.css`. Import your overrides **after** it so
same-specificity rules win via cascade.

```tsx
import "@scanupload/qr-code-generator-react/dist/index.css";
import "./my-overrides.css";
```

See the [root README](../../README.md#css-custom-properties) for the full list
of `--sqg-*` tokens.

## Other exports

- `useQrCodeCore` — hook returning `{ state, core, retrySession }`
- `usePersistentState` — read/write helpers backed by the configured
  `StorageAdapter`
- `DownloadButton` — the button `showDownloadButton` renders
- `QrCodeGeneratorProps`, `DownloadButtonProps`

## License

MIT © Donald Asante
