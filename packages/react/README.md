# @scanupload/qr-code-generator-react

React component wrapper for the ScanUpload QR Code Generator. Renders a QR code, manages the live upload session over SignalR, and shows uploaded-file previews.

## Install

```bash
npm install @scanupload/qr-code-generator-react
```

Peer dependencies: `react >= 19`, `react-dom >= 19`.

## Quick start

```tsx
import { QrCodeGenerator } from '@scanupload/qr-code-generator-react';
import '@scanupload/qr-code-generator-react/dist/index.css';

export function UploadWidget() {
    return (
        <QrCodeGenerator
            sessionUrl='/api/front-end/session'
            clientId='your-tenant-id'
            header='Upload files from your phone'
            showHeader
            showDownloadButton
        />
    );
}
```

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

## Downloads

When `showDownloadButton` is `true`, a button appears beneath the file previews. Clicking it iterates the live `state.uploadedFiles` and fetches each `url`, triggering a browser save for every file the hub has surfaced. A single bad URL doesn't abort the rest — a per-batch error toast is shown if any file fails.

You can also render `<DownloadButton>` on its own:

```tsx
import { DownloadButton } from '@scanupload/qr-code-generator-react';

<DownloadButton core={core} label='Save all' />;
```

## Styling

The package ships `dist/index.css`. Import your overrides **after** it so same-specificity rules win via cascade.

```tsx
import '@scanupload/qr-code-generator-react/dist/index.css';
import './my-overrides.css';
```

```css
:root {
    --sqg-primary: #6366f1;
    --sqg-radius: 1rem;
}
```

See the [root README](../../README.md#css-custom-properties) for the full list of `--sqg-*` tokens.

## Related exports

- `useQrCodeCore` — hook returning `{ state, core, retrySession }`
- `usePersistentState` — read/write helpers backed by the configured `StorageAdapter`
- `DownloadButton` — the same button the component renders when `showDownloadButton` is `true`
- `QrCodeGeneratorProps`, `DownloadButtonProps`

## License

MIT © Donald Asante
