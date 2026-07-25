# Svelte 5 + Vite demo

A minimal Vite + Svelte 5 app that integrates [`@scanupload/qr-code-generator-svelte`](../../packages/svelte).

## Run

```bash
npm install
npm run dev
```

The app starts on https://localhost:5176 (HTTPS is required for the hub's `Origin` checks).

## Configure

Copy `.env.example` to `.env` and fill in:

```env
VITE_SESSION_URL=https://hub.scanupload.net/api/v2/front-end/session
VITE_CLIENT_ID=your-tenant-id
```

The browser calls `VITE_SESSION_URL` directly; no client-side proxy is involved.

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

- `src/App.svelte` — root component
- `src/main.ts` — mounts the Svelte app
- `.env` / `.env.example` — environment configuration
