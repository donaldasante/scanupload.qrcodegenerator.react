# @scanupload/qr-code-generator

A multi-framework QR code generator for the
[ScanUpload](https://app.scanupload.net) backend. A mobile device scans the QR
code, uploads files to a ScanUpload session, and the desktop component receives
real-time status updates over SignalR — rendering a live preview of every
uploaded file.

This is a **monorepo** with a framework-agnostic core and dedicated adapter
packages for React, Vue, Angular, Svelte, and Vanilla JS/TS.

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
            clientId='your-client-id'
            header='Upload files from your phone'
            showHeader
            showDownloadButton
        />
    );
}
```

The browser `POST`s to `sessionUrl` directly. The ScanUpload hub authenticates
the request from the browser's `Origin` header — no API token, no client-side
proxy.

## Get a client ID

The `clientId` prop identifies your tenant. Create it in the ScanUpload
Dashboard:

1. Log in or sign up to the
   [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any
client-side env file. The browser only needs the client ID.

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

All framework adapters share the same prop names. (Vue uses kebab-case in
templates; Angular binds booleans with `[propName]`.) See each package's README
for adapter-specific syntax.

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

`@scanupload/qr-code-generator-uppy` is an optional, headless Uppy plugin. It is
the only package that depends on Uppy — every other package here works with or
without it.

```ts
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import ScanUpload from '@scanupload/qr-code-generator-uppy';

const uppy = new Uppy({ autoProceed: true }).use(ScanUpload, { sessionUrl, clientId }).use(XHRUpload, { endpoint: '/api/uploads' });
```

Each photo uploaded from the phone is downloaded by the browser and added to
Uppy as a normal file, so any Uppy uploader (XHR, Tus, S3) can send it on. To
render the QR code, bind a ScanUpload widget to the plugin's core so both share
one session:

```tsx
const plugin = uppy.getPlugin<ScanUploadPlugin>('ScanUpload');

<QrCodeGenerator sessionUrl={sessionUrl} core={plugin?.getCore()} />;
```

See [`packages/uppy/README.md`](packages/uppy) for the full option list and
per-framework snippets.

## CSS custom properties

All packages share the same `--sqg-*` token names. Override them on `:root` to
theme every widget at once.

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

Runnable examples live in `examples/`. Each demo calls the hub directly using
`VITE_SESSION_URL` (or `NEXT_PUBLIC_SESSION_URL`):

| Demo                                       | Run                   |
| ------------------------------------------ | --------------------- |
| [React + Vite](examples/react-demo)        | `npm run dev:react`   |
| [Vue 3 + Vite](examples/vue-demo)          | `npm run dev:vue`     |
| [Angular + Vite](examples/angular-demo)    | `npm run dev:angular` |
| [Svelte 5 + Vite](examples/svelte-demo)    | `npm run dev:svelte`  |
| [Vanilla JS + Vite](examples/vanilla-js)   | `npm run dev:vanilla` |
| [Next.js App Router](examples/nextjs-demo) | `npm run dev:nextjs`  |

All six demos run the same layout and the same Uppy integration, so any of them
can be used as the reference. One card holds two panels — **From your phone**
(the ScanUpload widget) and **From this device** (an Uppy Dashboard) — both
feeding a single `Uppy` instance, so a file that arrives from the phone and one
dropped locally are uploaded the same way, through `@uppy/xhr-upload`.

Files go to `/demo-upload`, a mock endpoint each demo's server answers — the
`mockUploadEndpoint()` plugin in the Vite demos' `vite.config.js`, and
`app/demo-upload/route.ts` (a route handler) in the Next.js demo. Set
`VITE_UPLOAD_ENDPOINT` — or `NEXT_PUBLIC_UPLOAD_ENDPOINT` — to upload somewhere
real instead.

## Deploying

The browser creates the ScanUpload session with an HTTPS request, then uses
SignalR over a secure WebSocket. Most connection failures in production come
from browser security policy or an origin mismatch, not from the integration.

### Allowed origins

Register the exact public application origin in the
[ScanUpload Dashboard](https://app.scanupload.net/dashboard): scheme, hostname
and port must all match. `https://app.example.com` and
`https://app.example.com:443` are not interchangeable in every CORS
configuration. Add each environment separately.

For local development, enable **Test Mode** on the client configuration to
bypass origin validation, so the local HTTPS dev server can create a session.
Without it the request fails with:

```text
The origin 'https://localhost:5173' is not in the AllowedOrigins list for tenant '...'.
```

Disable Test Mode before deploying.

### CSP

If your site sends a Content Security Policy, allow the hub in `connect-src` for
**both** protocols:

```text
connect-src 'self' https://hub.scanupload.net wss://hub.scanupload.net;
```

`https://` permits the session API request; `wss://` permits the SignalR
negotiate and WebSocket traffic. CSP does not infer `wss://` permission from an
`https://` entry. The included Nginx configuration receives these sources
through `CONNECT_SRC`; use the equivalent `connect-src` directive in Apache,
IIS, a CDN, or your application server.

Inspect the **document** response in browser DevTools, not just a JavaScript
asset. Multiple CSP headers are all enforced, and
`Content-Security-Policy-Report-Only` logs a warning without blocking — so check
whether an extension, CDN, or reverse proxy adds a second policy.

### CORS, SignalR, and proxies

- Serve the application over HTTPS. An HTTPS page can use `wss://`; an HTTP page
  is blocked from connecting to the secure hub by mixed-content rules.
- These examples connect directly to the hub, so a reverse proxy is not
  required. If you introduce one, forward the browser `Origin` header and enable
  WebSocket upgrade forwarding for the SignalR route (`Upgrade` and `Connection`
  headers).
- A session API success followed by a failed SignalR negotiation usually means
  `wss://hub.scanupload.net` is missing from CSP, the allowed origin list, or
  proxy WebSocket support.

### Configuration and diagnostics

Vite replaces `VITE_*` values when it builds the JavaScript bundle, so changing
container runtime environment variables after the image is built does not change
the deployed app — rebuild the image with the new values. Never expose a client
secret through a `VITE_*` or `NEXT_PUBLIC_*` variable.

In DevTools, check the Console for CSP and mixed-content errors, then check
Network for the session request and the SignalR `negotiate` request. The
response headers and the request's `Origin` value identify the policy or CORS
layer that must be updated.

### Vercel

[`examples/nextjs-demo`](examples/nextjs-demo) is the demo that deploys, and it
deploys from this monorepo rather than from a copy of its source.

| Vercel setting   | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Root Directory   | `examples/nextjs-demo`                                                       |
| Framework Preset | Next.js                                                                      |
| Install Command  | `cd ../.. && npm install` — from `examples/nextjs-demo/vercel.json`          |
| Build Command    | `cd ../.. && npm run build:nextjs` — from `examples/nextjs-demo/vercel.json` |

Both commands run from the workspace root on purpose. The demo consumes
`@scanupload/qr-code-generator-core`, `-react` and `-uppy` from their `dist/`
folders, and `dist` is gitignored, so a build that runs only `next build` cannot
resolve them; `build:nextjs` builds those packages first. Keep _Include source
files outside of the Root Directory in the Build Step_ enabled so the checkout
contains `packages/`.

`NEXT_PUBLIC_*` values are inlined when the app is built, so add these to the
Vercel project for **Production and Preview**, then redeploy after changing any
of them:

| Variable                      | Value                                       |
| ----------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SESSION_URL`     | `/hub-api/api/v2/front-end/session`         |
| `NEXT_PUBLIC_CLIENT_ID`       | your client ID from the dashboard           |
| `NEXT_PUBLIC_HUB_API_TARGET`  | `https://hub.scanupload.net` (the default)  |
| `NEXT_PUBLIC_UPLOAD_ENDPOINT` | optional; defaults to the demo's mock route |

Two things that only bite on Vercel:

- **Every deployment and branch alias is its own origin.** Production is served
  from your domain, previews from `<project>-<hash>-<team>.vercel.app` plus a
  per-branch alias, and the hub's allowed-origin check treats each as a separate
  origin. Register the production origin (see
  [Allowed origins](#allowed-origins)) and either register preview origins too
  or leave **Test Mode** on while previewing.
- **The built-in upload endpoint is a serverless function.** Vercel rejects
  request bodies over roughly 4.5 MB, so phone photos above that size fail
  against `app/demo-upload/route.ts` with a 413. Point
  `NEXT_PUBLIC_UPLOAD_ENDPOINT` at a real backend to accept full-size uploads.
- **Native binaries must be pinned per platform.** The lockfile is generated on
  Windows, and npm only records the optional native binaries for the platform it
  runs on — so `lightningcss` (pulled in by Vite and by `@tailwindcss/postcss`)
  had no Linux binding to load and the build died in
  `node_modules/lightningcss/node/index.js`. The root `optionalDependencies`
  therefore pin the Darwin, Linux (glibc and musl) and Windows binaries, and npm
  installs whichever one matches. Those pins are exact on purpose: a native
  binding has to match the JS wrapper of the resolved `lightningcss`, so bump
  them together with it.

Deployments arrive the same way the packages do: the pipeline's **Mirror repo to
GitHub** step pushes `HEAD` and tags to the GitHub mirror and Vercel builds from
that repository. The mirror currently runs on `release.*` tag pushes only, so a
connected project deploys on releases rather than on every commit.

## Development

```bash
npm install              # install all workspace dependencies
npm run build            # build all packages in dependency order
npm run dev:react        # run the React demo (rebuild packages first)
```

> The demos resolve packages from their local `dist/` folder. Always rebuild
> after changing any package source.

### Releases

Every workspace shares one version — the seven packages and the six private
demos — and they are bumped together. The `version` fields and the internal
`"@scanupload/*": "^0.2.x"` dependency ranges move in the same pass (the demos
and the packages both pin their siblings explicitly), and `npm install` then
refreshes `package-lock.json`.

## License

MIT © Donald Asante
