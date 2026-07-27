# @scanupload/qr-code-generator-svelte

Svelte 5 component wrapper for the ScanUpload QR Code Generator. Renders a QR code, manages the live upload session over SignalR, and shows uploaded-file previews.

## Install

```bash
npm install @scanupload/qr-code-generator-svelte
```

Peer dependency: `svelte >= 5`.

## Quick start

```svelte
<script lang="ts">
    import { QrCodeGenerator } from '@scanupload/qr-code-generator-svelte';
    import '@scanupload/qr-code-generator-svelte/dist/index.css';
</script>

<QrCodeGenerator
    sessionUrl="/api/front-end/session"
    clientId="your-tenant-id"
    header="Upload files from your phone"
    showHeader={true}
    showDownloadButton={true}
/>
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

`sessionUrl` is reactive — changing it at runtime updates the live session via the core `setOptions` API.

## Downloads

When `showDownloadButton` is `true`, a `<DownloadButton>` appears beneath the file previews. Clicking it iterates the live `state.uploadedFiles` and fetches each `url`, triggering a browser save for every file the hub has surfaced. A per-batch error toast is shown if any file fails.

You can also import `<DownloadButton>` on its own:

```svelte
<script lang="ts">
    import { DownloadButton, createQrCodeController } from '@scanupload/qr-code-generator-svelte';

    const controller = createQrCodeController({ sessionUrl: '/api/front-end/session' });
</script>

<DownloadButton core={controller.core} />
```

## Styling

The package ships `dist/index.css`. Import your overrides **after** it.

```svelte
<script>
    import '@scanupload/qr-code-generator-svelte/dist/index.css';
    import './my-overrides.css';
</script>
```

See the [root README](../../README.md#css-custom-properties) for the full list of `--sqg-*` tokens.

## Related exports

- `createQrCodeController` — store-based controller wrapping the core runtime
- `DownloadButton` — the same button the main component renders when `showDownloadButton` is `true`
- `Logo`, `ProgressBar`, `FileList`, `DocumentPreviewer`

## License

MIT © Donald Asante
