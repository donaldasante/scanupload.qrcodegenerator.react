# @scanupload/qr-code-generator-vue

Vue 3 component wrapper for the ScanUpload QR Code Generator. Renders a QR code, manages the live upload session over SignalR, and shows uploaded-file previews.

## Install

```bash
npm install @scanupload/qr-code-generator-vue
```

Peer dependency: `vue >= 3.4`.

## Quick start

```vue
<script setup lang="ts">
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';
import '@scanupload/qr-code-generator-vue/dist/index.css';
</script>

<template>
  <QrCodeGenerator
    session-url="/api/front-end/session"
    client-id="your-tenant-id"
    header="Upload files from your phone"
    :show-header="true"
    :show-download-button="true"
  />
</template>
```

## Props

Props use kebab-case in templates (e.g. `session-url`, `show-header`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sessionUrl` | `string` | — (required) | Endpoint that creates a ScanUpload session. |
| `clientId` | `string` | `undefined` | Optional tenant / Keycloak `client_id` sent in the request body. |
| `header` | `string` | `""` | Header text shown when `showHeader` is `true`. |
| `showHeader` | `boolean` | `false` | Render the header above the QR code. |
| `showLogo` | `boolean` | `true` | Overlay the ScanUpload logo in the centre of the QR code. |
| `clickQrCodeToReload` | `boolean` | `false` | When `true`, clicking the QR code reloads the session. |
| `filePreviewMode` | `"grid" \| "list"` | `"grid"` | Display uploaded files as tiles or a compact list. |
| `size` | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"` | Overall size of the QR code container. |
| `showDownloadButton` | `boolean` | `false` | Show a "Download all files" button that fetches every `UploadedFile.url` and triggers a browser save. |

`sessionUrl` is reactive — changing it at runtime updates the live session via the core `setOptions` API.

## Downloads

When `showDownloadButton` is `true`, a button appears beneath the file previews. Clicking it iterates the live `state.uploadedFiles` and fetches each `url`, triggering a browser save for every file the hub has surfaced. A per-batch error toast is shown if any file fails.

You can also import `<DownloadButton>` on its own:

```vue
<script setup lang="ts">
import { DownloadButton, useQrCodeCore } from '@scanupload/qr-code-generator-vue';

const { state, core } = useQrCodeCore({ sessionUrl: '/api/front-end/session' });
</script>

<template>
  <DownloadButton :core="core" />
</template>
```

## Styling

The package ships `dist/index.css`. Import your overrides **after** it.

```ts
import '@scanupload/qr-code-generator-vue/dist/index.css';
import './my-overrides.css';
```

See the [root README](../../README.md#css-custom-properties) for the full list of `--sqg-*` tokens.

## Related exports

- `useQrCodeCore` — composable returning `{ state, core, retrySession, setOptions }`
- `usePersistentState` — read/write helpers backed by the configured `StorageAdapter`
- `DownloadButton` — the same button the component renders when `showDownloadButton` is `true`

## License

MIT © Donald Asante
