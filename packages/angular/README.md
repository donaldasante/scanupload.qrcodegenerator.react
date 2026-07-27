# @scanupload/qr-code-generator-angular

Angular standalone component wrapper for the ScanUpload QR Code Generator. Renders a QR code, manages the live upload session over SignalR, and shows uploaded-file previews.

## Install

```bash
npm install @scanupload/qr-code-generator-angular
```

Peer dependencies: `@angular/core >= 20.2.0`, `@angular/common >= 20.2.0`.

## Quick start

```ts
import { Component } from '@angular/core';
import { QrCodeGeneratorComponent } from '@scanupload/qr-code-generator-angular';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [QrCodeGeneratorComponent],
    template: `
        <sqg-qr-code-generator
            [sessionUrl]="sessionUrl"
            [clientId]="clientId"
            [showHeader]="true"
            header="Upload files from your phone"
            [showDownloadButton]="true"
        ></sqg-qr-code-generator>
    `
})
export class AppComponent {
    readonly sessionUrl = 'https://hub.scanupload.net/api/v2/front-end/session';
    readonly clientId = 'your-tenant-id';
}
```

Import the stylesheet once (e.g. in `styles.css`):

```css
@import '@scanupload/qr-code-generator-angular/dist/index.css';
```

## Inputs

| Input                 | Type                                         | Default      | Description                                                                                                                             |
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

When `showDownloadButton` is `true`, a `<sqg-download-button>` appears beneath the file previews. Clicking it iterates the live `state.uploadedFiles` and fetches each `url`, triggering a browser save for every file the hub has surfaced. A per-batch error toast is shown if any file fails.

You can also import `<sqg-download-button>` on its own:

```ts
import { DownloadButtonComponent } from '@scanupload/qr-code-generator-angular';

@Component({
    imports: [DownloadButtonComponent],
    template: `<sqg-download-button [core]="controller.core"></sqg-download-button>`
})
export class MyComponent {}
```

## Styling

The package ships `dist/index.css`. Import your overrides **after** it.

```css
@import '@scanupload/qr-code-generator-angular/dist/index.css';
@import './my-overrides.css';
```

See the [root README](../../README.md#css-custom-properties) for the full list of `--sqg-*` tokens.

## Related exports

- `useQrCodeCore` — signal-based controller wrapping the core runtime
- `DownloadButtonComponent` — the same button the main component renders when `showDownloadButton` is `true`
- `LogoComponent`, `ProgressBarComponent`, `FileListComponent`, `DocumentPreviewerComponent`

## License

MIT © Donald Asante
