# Next.js App Router demo

A minimal Next.js (App Router) app that integrates [`@scanupload/qr-code-generator-react`](../../packages/react). The browser calls the hub directly — no client-side or Next.js-side proxy is involved.

## Run

```bash
npm install
npm run dev
```

The app starts on **https**://localhost:3000 (HTTPS is required — see below).

### Why HTTPS?

The dev server runs with `next dev --experimental-https` so the browser treats the page as a secure origin. Without HTTPS:

- The browser blocks the SignalR WebSocket upgrade (an HTTP page can't open a `wss://` connection without mixed-content errors).
- The browser omits the `Origin` header on same-origin requests, and the hub's `FrontEndSessionAuthorizationHandler` can't authenticate the session.

On the first visit the browser shows a "Your connection is not private" warning because Next.js auto-generates a self-signed certificate. Click **Advanced → Proceed to localhost** to accept it for this dev session.

> To avoid the self-signed warning entirely, install [`mkcert`](https://github.com/FiloSottile/mkcert), then set `NEXT_DEV_HTTPS_KEY_PATH` and `NEXT_DEV_HTTPS_CERT_PATH` env vars before running `npm run dev`. Next.js will pick those up automatically.

## Configure

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SESSION_URL=https://hub.scanupload.net/api/v2/front-end/session
NEXT_PUBLIC_CLIENT_ID=your-tenant-id
```

The browser calls `NEXT_PUBLIC_SESSION_URL` directly; the hub authenticates from the `Origin` header.

## Get a client ID

1. Log in or sign up to the [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any client-side env file. The browser only needs the client ID.

## What it shows

- The QR code, loading overlay, and error overlay
- A settings panel that toggles `showHeader`, `showLogo`, `clickQrCodeToReload`, `filePreviewMode`, and `size`
- The "Download all files" button (via `showDownloadButton={true}`)

## Files

- `app/page.tsx` — root route
- `app/layout.tsx` — root layout
- `app/components/ClientPage.tsx` — client-only wrapper (dynamic import with `ssr: false`)
- `app/components/GeneralForm.tsx` — the demo widget + settings panel
- `.env.example` — environment configuration
