# Next.js App Router demo

A minimal Next.js (App Router) app that integrates [`@scanupload/qr-code-generator-react`](../../packages/react). The browser calls the hub directly — no client-side or Next.js-side proxy is involved.

## Run

```bash
npm install
npm run dev
```

The app starts on http://localhost:3000.

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
