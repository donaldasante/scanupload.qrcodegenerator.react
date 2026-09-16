# @scanupload/qr-code-generator

A multi-framework QR code generator for the [ScanUpload](https://app.scanupload.net) backend. A mobile device scans the QR code, uploads files to a ScanUpload session, and the desktop component receives real-time status updates over SignalR — rendering a live preview of every uploaded file.

This is a **monorepo** with a framework-agnostic core and dedicated adapter packages for React, Vue, Angular, Svelte, and Vanilla JS/TS.

## Packages

| Package                                                     | What it provides                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`@scanupload/qr-code-generator-core`](packages/core)       | Framework-agnostic runtime — SignalR, session management, types                                  |
| [`@scanupload/qr-code-generator-react`](packages/react)     | React `<QrCodeGenerator>` component                                                              |
| [`@scanupload/qr-code-generator-vue`](packages/vue)         | Vue 3 `<QrCodeGenerator>` component                                                              |
| [`@scanupload/qr-code-generator-angular`](packages/angular) | Angular `<sqg-qr-code-generator>` standalone component                                           |
| [`@scanupload/qr-code-generator-svelte`](packages/svelte)   | Svelte 5 `<QrCodeGenerator>` component                                                           |
| [`@scanupload/qr-code-generator-vanilla`](packages/vanilla) | `QrCodeGeneratorElement` — framework-free DOM renderer                                           |
| [`@scanupload/qr-code-generator-uppy`](packages/uppy)       | Headless [Uppy](https://uppy.io/) plugin that pipes phone uploads straight into an Uppy instance |

See each package's README for full details and a quick-start snippet.

## Quick start (React)

```bash
npm install @scanupload/qr-code-generator-react
```

```tsx
import { QrCodeGenerator } from '@scanupload/qr-code-generator-react';
import '@scanupload/qr-code-generator-react/dist/index.css';

export function UploadWidget() {
    return (
        <QrCodeGenerator
            sessionUrl='https://hub.scanupload.net/api/v2/front-end/session'
            clientId='your-tenant-id'
            header='Upload files from your phone'
            showHeader
            showDownloadButton
        />
    );
}
```

The browser `POST`s to `sessionUrl` directly. The ScanUpload hub authenticates the request from the browser's `Origin` header — no API token, no client-side proxy.

## Common props

| Prop                  | Type                                         | Default      | Description                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sessionUrl`          | `string`                                     | — (required) | Endpoint that creates a ScanUpload session. The browser POSTs here; the hub authenticates from `Origin`.                                                                                                     |
| `clientId`            | `string`                                     | `undefined`  | Optional tenant / Keycloak `client_id` sent in the request body as `{ "clientId": "..." }`.                                                                                                                  |
| `header`              | `string`                                     | `""`         | Header text shown when `showHeader` is `true`.                                                                                                                                                               |
| `showHeader`          | `boolean`                                    | `false`      | Render the header above the QR code.                                                                                                                                                                         |
| `showLogo`            | `boolean`                                    | `true`       | Overlay the ScanUpload logo in the centre of the QR code.                                                                                                                                                    |
| `clickQrCodeToReload` | `boolean`                                    | `false`      | When `true`, clicking the QR code reloads the session. When `false`, a Reload button is shown.                                                                                                               |
| `filePreviewMode`     | `"grid" \| "list"`                           | `"grid"`     | Display uploaded files as tiles or a compact list.                                                                                                                                                           |
| `size`                | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"`    | Overall size of the QR code container.                                                                                                                                                                       |
| `autoResession`       | `boolean`                                    | `false`      | Create a fresh session automatically when the current one expires. By default, the disconnected state and Reload action remain visible.                                                                      |
| `showDownloadButton`  | `boolean`                                    | `false`      | Show a "Download all files" button beneath the previews. When clicked, the component fetches every `UploadedFile.url` the SignalR hub has surfaced and triggers a browser save for each.                     |
| `showFilePreviews`    | `boolean`                                    | `true`       | Render the files received from the phone inside the widget. Set to `false` when something else already renders them — typically an Uppy Dashboard — so they are not shown twice.                             |
| `core`                | `QrCodeGeneratorCore \| null`                | `undefined`  | Bind to an existing core instead of creating one, so the widget shares a single session with another owner (typically the Uppy plugin). While set, `sessionUrl`, `clientId` and `autoResession` are ignored. |
| `onFileAvailable`     | `(file, origin) => void`                     | `undefined`  | Called for every file the hub is holding, including files that were already there when this client connected. `origin` is `'live'` or `'restored'`.                                                          |
| `onFileRemoved`       | `(file) => void`                             | `undefined`  | Called when the hub drops a single file. Not called for a full clear.                                                                                                                                        |
| `onFilesCleared`      | `(files) => void`                            | `undefined`  | Called when every file is cleared at once — a session reset, or the session ending.                                                                                                                          |

All framework adapters share the same prop names. (Vue uses kebab-case in templates; Angular binds booleans with `[propName]`.) See each package's README for adapter-specific syntax.

### Routing files somewhere else

The three callbacks above let a widget hand its files to something that is not
this widget. Pair them with `showFilePreviews={false}` so the files are rendered
once, in the place you chose:

```tsx
const [received, setReceived] = useState<UploadedFile[]>([]);

<QrCodeGenerator
    sessionUrl={sessionUrl}
    showFilePreviews={false}
    onFileAvailable={(file) => setReceived((prev) => [...prev, file])}
    onFileRemoved={(file) => setReceived((prev) => prev.filter((f) => f.id !== file.id))}
    onFilesCleared={() => setReceived([])}
/>;
```

For an uploader you do not have a bespoke adapter for, the core exposes the same
machinery vendor-neutrally — `connectScanUploadFiles` handles the download, the
transient-404 retry, de-duplication, concurrency and removal mirroring, so your
integration is only a "given a file, put it here" sink:

```ts
import { connectScanUploadFiles } from '@scanupload/qr-code-generator-core';

const connection = connectScanUploadFiles({
    core: plugin.getCore(),
    sink: { add: (file) => myUploader.attach(file) }
});
```

See [`packages/core/README.md`](packages/core#feeding-another-uploader) for the
sink contract and for the caveat about **closed widgets** (react-uploader, the
Bytescale Upload Widget), which expose no way to insert files you already hold
and therefore need an application-owned list instead.

## Uppy integration

`@scanupload/qr-code-generator-uppy` is an optional, headless Uppy plugin. It is the only package that depends on Uppy — every other package here works with or without it.

```ts
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import ScanUpload from '@scanupload/qr-code-generator-uppy';

const uppy = new Uppy({ autoProceed: true }).use(ScanUpload, { sessionUrl, clientId }).use(XHRUpload, { endpoint: '/api/uploads' });
```

Each photo uploaded from the phone is downloaded by the browser and added to Uppy as a normal file, so any Uppy uploader (XHR, Tus, S3) can send it on. To render the QR code, bind a ScanUpload widget to the plugin's core so both share one session:

```tsx
const plugin = uppy.getPlugin<ScanUploadPlugin>('ScanUpload');

<QrCodeGenerator sessionUrl={sessionUrl} core={plugin?.getCore()} />;
```

See [`packages/uppy/README.md`](packages/uppy) for the full option list and per-framework snippets.

## CSS custom properties

All packages share the same `--sqg-*` token names. Override them on `:root` to theme every widget at once.

```css
:root {
    --sqg-primary: #6366f1;
    --sqg-radius: 1rem;
}
```

| Token                   | Default                    | Affects                                                          |
| ----------------------- | -------------------------- | ---------------------------------------------------------------- |
| `--sqg-primary`         | `#1e3a5f`                  | Spinner ring, connected logo, retry / download button background |
| `--sqg-primary-hover`   | `#1e40af`                  | Hover state for primary buttons                                  |
| `--sqg-bg`              | `#ffffff`                  | Widget background                                                |
| `--sqg-text`            | `#111827`                  | Main text colour                                                 |
| `--sqg-text-muted`      | `#6b7280`                  | Hint text, file sizes                                            |
| `--sqg-border`          | `#d1d5db`                  | QR wrapper border, file card border                              |
| `--sqg-success`         | `#22c55e`                  | Connected logo accent                                            |
| `--sqg-error`           | `#dc2626`                  | Error overlay text, disconnected logo, download error text       |
| `--sqg-error-dark`      | `#991b1b`                  | Disconnected logo gradient end                                   |
| `--sqg-overlay-bg`      | `rgba(255,255,255,0.9)`    | Loading / error overlay background                               |
| `--sqg-retry-bg`        | `#93c5fd`                  | Retry button background                                          |
| `--sqg-retry-bg-hover`  | `#3b82f6`                  | Retry button hover                                               |
| `--sqg-reload-bg`       | `#6b7280`                  | Reload button background                                         |
| `--sqg-reload-bg-hover` | `var(--sqg-primary-hover)` | Reload button hover                                              |
| `--sqg-spinner-color`   | `var(--sqg-primary)`       | Spinner ring colour                                              |
| `--sqg-radius`          | `0.5rem`                   | Border radius for buttons and cards                              |

## Demos

Runnable examples live in `examples/`. Each demo calls the hub directly using `VITE_SESSION_URL` (or `NEXT_PUBLIC_SESSION_URL`):

| Demo                                       | Run                   |
| ------------------------------------------ | --------------------- |
| [React + Vite](examples/react-demo)        | `npm run dev:react`   |
| [Vue 3 + Vite](examples/vue-demo)          | `npm run dev:vue`     |
| [Angular + Vite](examples/angular-demo)    | `npm run dev:angular` |
| [Svelte 5 + Vite](examples/svelte-demo)    | `npm run dev:svelte`  |
| [Vanilla JS + Vite](examples/vanilla-js)   | `npm run dev:vanilla` |
| [Next.js App Router](examples/nextjs-demo) | `npm run dev:nextjs`  |

All six demos run the same layout and the same Uppy integration, so any of them
can be used as the reference:

- One card holds two panels — **From your phone** (the ScanUpload widget) and
  **From this device** (an Uppy Dashboard). Both feed a single `Uppy` instance,
  so a file that arrives from the phone and one dropped locally are uploaded the
  same way, through `@uppy/xhr-upload`.
- The drop zone mirrors the QR square. The square's measured rect is published on
  the card as `--scan-height` / `--scan-offset`, so the two panels start on the
  same line; once files arrive the drop zone grows into the card's spare height
  and only then scrolls, so added files stay readable.
- Below `66rem` everything stacks and the page scrolls normally. At or above
  `66rem` the settings card sits beside the widget card and the two panels sit
  side by side.

Files go to `/demo-upload`, a mock endpoint each demo's server answers — the
`mockUploadEndpoint()` plugin in the Vite demos' `vite.config.js`, and
`app/demo-upload/route.ts` (a route handler) in the Next.js demo. Set
`VITE_UPLOAD_ENDPOINT` — or `NEXT_PUBLIC_UPLOAD_ENDPOINT` — to upload somewhere
real instead.

## Architecture

The package READMEs cover each adapter; the sections below cover what they share.

### Layout & sizing

Every package emits the same DOM around the component for predictable styling:

| Element               | Class                                     | Notes                                                                                                                                                                                                                                                                                                                        |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root                  | `.sqg-root`                               | `data-size="small\|medium\|large\|xlarge"` is set on the root, and `[data-size="..."]` rules in each package's CSS drive the QR container width/height (80, 120, 160, 192 px). The QR `<svg>` from `qrcode` always bakes `width="200"` so the inner SVG needs explicit `width: 100%; height: 100%` to scale.                 |
| Content               | `.sqg-content`                            | A flex column. When the file container has actual file elements (`.sqg-file-card` or `.sqg-file-row`), `.sqg-content` grows to fill the widget via `:has()`.                                                                                                                                                                 |
| File container (grid) | `.sqg-file-grid`                          | Direct child of `.sqg-content`. Flex row, wraps, scrolls vertically on overflow.                                                                                                                                                                                                                                             |
| File container (list) | `.sqg-file-list` + `.sqg-file-list-inner` | The scrolling context is the **inner** element — putting `overflow: hidden` on the inner element while `overflow-y: auto` lives on the outer list causes the browser to measure scrollHeight as the outer height (clipped), so no scrollbar appears. The inner element must carry `overflow-y: auto` for the list to scroll. |

### Demo layout

All six demos share one stylesheet and one DOM shape, so a change to the pattern
applies everywhere:

| Element       | Class / attribute | Notes                                                                                                                                                      |
| ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings card | `.demo-card`      | Holds the form controls only, and is content-sized — the widget no longer lives inside it, so nothing in it scrolls.                                       |
| Upload card   | `.upload-box`     | One card, two `.half` panels — the QR widget and the Uppy Dashboard. Stacked below `66rem`, side by side at or above it.                                   |
| Widget slot   | `.scan-widget`    | Centres the widget and lets it shrink (`min-width: 0`). Vanilla mounts into `<div id="widget-container" class="scan-widget">`; same role on every adapter. |
| Uppy slot     | `.uppy-shell`     | Positioned wrapper for `.uppy-host`, the element the Dashboard mounts into. Carries `has-files` while Uppy holds files.                                    |
| Drop badge    | `.drop-icon`      | Decorative upload glyph over the empty drop zone; hidden by `has-files` as soon as a file arrives.                                                         |

Two custom properties, published on `.upload-box` by each demo's entry file,
keep the two panels level:

| Property        | Measured from                             | Effect                                                                    |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `--scan-height` | the `.sqg-qr-wrapper` square's height     | The drop zone is never shorter than the QR square.                        |
| `--scan-offset` | the square's top, relative to its wrapper | Pushes the drop zone down to the square's line, clearing the panel title. |

The dashed square is measured rather than the whole widget, because the drop
zone lines up with the code, not with the header above it or the hint below.
`has-files` growth is capped at `min(60svh, 26rem)` below `66rem`.

## Development

```bash
npm install              # install all workspace dependencies
npm run build            # build all packages in dependency order
npm run dev:react        # run the React demo (rebuild packages first)
```

> The demos resolve packages from their local `dist/` folder. Always rebuild after changing any package source.

### Releases

Every workspace shares one version — the seven packages and the six private demos
— and they are bumped together. The `version` fields and the internal
`"@scanupload/*": "^0.2.x"` dependency ranges move in the same pass (the demos
and the packages both pin their siblings explicitly), and `npm install` then
refreshes `package-lock.json`.

## License

MIT © Donald Asante
