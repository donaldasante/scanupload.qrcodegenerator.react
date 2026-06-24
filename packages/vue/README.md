# @scanupload/qr-code-generator-vue

Vue 3 component wrapper for the ScanUpload QR Code Generator. It renders a QR
code, manages the live upload session, and shows uploaded-file previews using
the shared core runtime.

## Installation

```bash
npm install @scanupload/qr-code-generator-vue
```

Peer dependency:

- `vue >= 3.4`

## Quick start

```vue
<script setup lang="ts">
import { QrCodeGenerator } from '@scanupload/qr-code-generator-vue';
import '@scanupload/qr-code-generator-vue/dist/index.css';
</script>

<template>
    <QrCodeGenerator session-url="/api/session" refresh-token-url="/api/token" header="Upload documents" :show-header="true" />
</template>
```

## Backend Integration

- [ScanUpload.Api.Client](https://github.com/donaldasante/scanupload.api.client)
  — ScanUpload backend proxy (.NET)

The component needs two backend endpoints:

| Endpoint          | Method | Description                                                                                   |
| ----------------- | ------ | --------------------------------------------------------------------------------------------- |
| `sessionUrl`      | `POST` | Creates a ScanUpload session and returns `{ sessionId, accessToken, hubUrl, deviceLoginUrl }` |
| `refreshTokenUrl` | `POST` | Returns a fresh Bearer token `{ access_token, expires_in }`                                   |

## Props

Props use kebab-case attribute names in templates (e.g. `session-url`,
`show-header`).

| Prop                  | Type                                         | Default   | Required | Description                                                           |
| --------------------- | -------------------------------------------- | --------- | -------- | --------------------------------------------------------------------- |
| `sessionUrl`          | `string`                                     | —         | Yes      | Endpoint that creates a ScanUpload session.                           |
| `refreshTokenUrl`     | `string`                                     | —         | Yes      | Endpoint that refreshes the access token.                             |
| `header`              | `string`                                     | —         | No       | Text shown in the header when `showHeader` is enabled.                |
| `showHeader`          | `boolean`                                    | `false`   | No       | Whether to render the header.                                         |
| `showLogo`            | `boolean`                                    | `true`    | No       | Whether to overlay the ScanUpload logo on the QR code.                |
| `clickQrCodeToReload` | `boolean`                                    | `false`   | No       | Reload the session by clicking the QR code instead of using a button. |
| `filePreviewMode`     | `"grid" \| "list"`                           | `"grid"`  | No       | Display files as tiles or a compact list.                             |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"` | No       | Controls the overall widget size.                                     |

The `sessionUrl` and `refreshTokenUrl` props are reactive — changing them at
runtime updates the live session via the core `setOptions` API.

## Styling

The package ships a compiled stylesheet at `dist/index.css`.

```ts
import '@scanupload/qr-code-generator-vue/dist/index.css';
import './my-overrides.css';
```

Override after the package CSS so normal cascade rules apply.

```css
:root {
    --sqg-primary: #1e3a5f;
    --sqg-border-radius: 1rem;
    --sqg-error-color: #dc2626;
}

.sqg-root {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}
```

## CSS custom properties

| Token                 | Default                  | Affects                                               |
| --------------------- | ------------------------ | ----------------------------------------------------- |
| `--sqg-primary`       | `#1e3a5f`                | Spinner ring, connected logo, retry button background |
| `--sqg-error-color`   | `#dc2626`                | Error text and disconnected logo                      |
| `--sqg-border-color`  | `#e5e7eb`                | Borders around the QR wrapper and file cards          |
| `--sqg-border-radius` | `0.75rem`                | Root and QR wrapper corner radius                     |
| `--sqg-bg`            | `#ffffff`                | Widget background                                     |
| `--sqg-overlay-bg`    | `rgba(255,255,255,0.85)` | Loading and error overlays                            |
| `--sqg-text-color`    | `#111827`                | Main text                                             |
| `--sqg-subtext-color` | `#6b7280`                | Secondary text                                        |
| `--sqg-spinner-size`  | `2.5rem`                 | Spinner width and height                              |
| `--sqg-spinner-width` | `3px`                    | Spinner stroke width                                  |

## File preview modes

### `grid`

Shows uploaded files as tiles with icons, optional image thumbnails, and upload
progress.

### `list`

Shows uploaded files as a compact list with thumbnail or file icon, file name,
and file size.

## Related exports

This package also re-exports:

- `useQrCodeCore`
- `usePersistentState`
- Core types such as `UploadedFile`, `QrCodeGeneratorState`, and
  `StorageAdapter`

## License

MIT © Donald Asante
