# Angular + Vite demo

A minimal Vite + Angular app that integrates [`@scanupload/qr-code-generator-angular`](../../packages/angular).

## Run

```bash
npm install
npm run dev
```

The app starts on https://localhost:5175 (HTTPS is required for the hub's `Origin` checks).

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

- An "Example Form" settings panel above the widget with:
  - Checkboxes for **Show Logo**, **Click QR code to reload**, and **Show header**
  - A text field for the header text
  - Radio groups for **File preview mode** (list/grid) and **Qr Code size** (small/medium/large/X-Large — mapped to the `"xlarge"` prop value)
- The QR code, loading overlay, and error overlay
- The "Download all files" button (via `[showDownloadButton]="true"`)

Every change in the panel is wired directly to the widget — toggling a checkbox or picking a different size updates the QR code live.

## Files

- `src/app.component.ts` — root component, including the settings form
- `src/index.css` — base layout + utility classes for the form controls
- `.env` / `.env.example` — environment configuration
