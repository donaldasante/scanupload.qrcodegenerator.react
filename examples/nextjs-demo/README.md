# Next.js App Router demo

A minimal Next.js (App Router) app that integrates
[`@scanupload/qr-code-generator-react`](../../packages/react) and
[`@scanupload/qr-code-generator-uppy`](../../packages/uppy). The session API
request uses the included `/hub-api` rewrite; SignalR still needs to be allowed
by the browser and any proxy in front of the app.

## Run

From the monorepo root:

```bash
npm install
npm run build:react
npm run dev:nextjs
```

`build:react` builds the core dependency and the React package consumed by this
linked-workspace demo.

The app starts on **https**://localhost:3000 (HTTPS is required — see below).

### Why HTTPS?

The dev server runs with `next dev --experimental-https` so the browser treats
the page as a secure origin. Without HTTPS:

- The browser blocks the SignalR WebSocket upgrade (an HTTP page can't open a
  `wss://` connection without mixed-content errors).
- The browser omits the `Origin` header on same-origin requests, and the hub's
  `FrontEndSessionAuthorizationHandler` can't authenticate the session.

On the first visit the browser shows a "Your connection is not private" warning
because Next.js auto-generates a self-signed certificate. Click **Advanced →
Proceed to localhost** to accept it for this dev session.

> To avoid the self-signed warning entirely, install
> [`mkcert`](https://github.com/FiloSottile/mkcert), then set
> `NEXT_DEV_HTTPS_KEY_PATH` and `NEXT_DEV_HTTPS_CERT_PATH` env vars before
> running `npm run dev`. Next.js will pick those up automatically.

## What the demo shows

The settings panel drives the widget's props. Beneath it sits one card holding
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
`/demo-upload`, a mock route handler (`app/demo-upload/route.ts`) that counts
the bytes and answers. Point `NEXT_PUBLIC_UPLOAD_ENDPOINT` at a real URL to
upload elsewhere.

`Show file previews` is off by default, because Uppy already renders everything
the phone sends and the widget's own list would show the same files twice.
Turning it on exercises the `File preview mode` and `Show download button`
controls too.

Uppy and the ScanUpload packages run in a client component mounted with
`ssr: false` (`app/components/ClientPage.tsx`), because Uppy touches `window` at
module scope and cannot be rendered on the server.

## Configure

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SESSION_URL=/hub-api/api/v2/front-end/session
NEXT_PUBLIC_HUB_API_TARGET=https://hub.scanupload.net
NEXT_PUBLIC_CLIENT_ID=your-client-id

# Optional — defaults to the mock route handler in `app/demo-upload`.
NEXT_PUBLIC_UPLOAD_ENDPOINT=https://your-api.example/uploads
```

`NEXT_PUBLIC_SESSION_URL` is the browser-visible route. `next.config.ts`
rewrites `/hub-api/*` to `NEXT_PUBLIC_HUB_API_TARGET`; set the target to the hub
base URL without a trailing slash. The hub authenticates from the browser's
`Origin` header.

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

The session request is same-origin when you use the supplied `/hub-api` rewrite,
but the widget still uses SignalR and can receive an absolute hub URL, so test
the API request and the SignalR negotiation separately in DevTools. Keep the
rewrite when you want a same-origin session request; if a CDN or reverse proxy
handles that route instead, preserve the browser `Origin` header.

### Vercel

This demo is the one wired up to deploy to Vercel from the monorepo:

- **Root Directory**: `examples/nextjs-demo`.
- Install and build commands live in `vercel.json` and run from the workspace
  root (`cd ../.. && npm install`, `cd ../.. && npm run build:nextjs`), because
  the ScanUpload packages are consumed from their gitignored `dist/` folders and
  must be built before `next build` can resolve them.
- Set `NEXT_PUBLIC_SESSION_URL`, `NEXT_PUBLIC_CLIENT_ID` and, if you changed it,
  `NEXT_PUBLIC_HUB_API_TARGET` in the Vercel project for **Production and
  Preview**, then redeploy — `NEXT_PUBLIC_*` values are inlined at build time.
- The mock upload route is a serverless function, so Vercel's ~4.5 MB body limit
  applies; point `NEXT_PUBLIC_UPLOAD_ENDPOINT` at a real backend for larger
  files.

See [Deploying → Vercel](../../README.md#vercel) in the root README for the
origins, CSP and preview-deployment checklist, and
[Deploying](../../README.md#deploying) for the general origin, CORS and proxy
notes.

## Files

- `app/page.tsx` — root route
- `app/layout.tsx` — root layout
- `app/components/ClientPage.tsx` — client-only wrapper (dynamic import with
  `ssr: false`)
- `app/components/GeneralForm.tsx` — the demo widget + settings panel
- `.env.example` — environment configuration
- `vercel.json` — install/build commands that build the workspace packages first
