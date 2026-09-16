# Vanilla JS + Vite demo

A minimal Vite + Vanilla TS app that integrates
[`@scanupload/qr-code-generator-vanilla`](../../packages/vanilla) and
[`@scanupload/qr-code-generator-uppy`](../../packages/uppy).

## Run

From the monorepo root:

```bash
npm install
npm run build:vanilla
npm run dev:vanilla
```

`build:vanilla` builds the core dependency and the Vanilla package, including
the stylesheet imported by this demo. Re-run it after changing either package.

The app starts on https://localhost:5174 (HTTPS is required for the hub's
`Origin` checks).

## What the demo shows

The settings panel drives the widget's options. Beneath it sits one card holding
the two ways into the same Uppy instance — side by side on wide screens, stacked
on narrow ones:

- **From your phone** — the ScanUpload QR code. The widget is bound to the
  plugin's core, so it renders the QR code for the session Uppy is listening on
  instead of opening a second one.
- **From this device** — the Uppy Dashboard. Files dropped here upload exactly
  like the ones that arrive from the phone.

The drop zone mirrors the QR square's measured height, so the two panels sit on
the same line. Once files are added it grows into the card's spare height and
only then scrolls, so the list stays readable.

Both halves feed one `Uppy` instance and one `@uppy/xhr-upload` plugin, so
swapping the destination (Tus, S3) applies to both. By default files go to
`/demo-upload`, a mock endpoint served by `vite.config.js` that counts the bytes
and answers. Point `VITE_UPLOAD_ENDPOINT` at a real URL to upload elsewhere.

`Show file previews` is off by default, because Uppy already renders everything
the phone sends and the widget's own list would show the same files twice.
Turning it on exercises the `File preview mode` and `Show download button`
controls too.

## Configure

Copy `.env.example` to `.env` and fill in:

```env
VITE_SESSION_URL=https://hub.scanupload.net/api/v2/front-end/session
VITE_CLIENT_ID=your-client-id

# Optional — defaults to the mock endpoint in `vite.config.js`.
VITE_UPLOAD_ENDPOINT=https://your-api.example/uploads
```

The browser calls `VITE_SESSION_URL` directly; no client-side proxy is involved.

## Get a client ID

1. Log in or sign up to the
   [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any
client-side env file. The browser only needs the client ID.

## Deploying

For local development, enable **Test Mode** on the client configuration so the
HTTPS dev server can create a session, and disable it before deploying. In
production, register the exact public origin and allow the hub in `connect-src`
for both `https://` and `wss://`.

See [Deploying](../../README.md#deploying) in the root README for the full
checklist, including CSP, CORS and proxy notes.

## Files

- `src/main.ts` — instantiates `QrCodeGeneratorElement` and wires the form
  controls to `setOptions`
- `index.html` — host page with the settings form and
  `<div id="widget-container">` mount point
- `src/index.css` — base layout + utility classes for the form controls
- `.env` / `.env.example` — environment configuration
