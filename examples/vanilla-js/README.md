# Vanilla JS + Vite demo

A minimal Vite + Vanilla TS app that integrates [`@scanupload/qr-code-generator-vanilla`](../../packages/vanilla).

## Run

```bash
npm install
npm run dev
```

The app starts on https://localhost:5177 (HTTPS is required for the hub's `Origin` checks).

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

## Production troubleshooting

The browser creates the ScanUpload session with an HTTPS request, then uses SignalR over a secure WebSocket. Most production connection failures are caused by browser security policy or an origin mismatch rather than the Vanilla JS integration.

### CSP

If your site sends a Content Security Policy, allow the hub in `connect-src` for **both** protocols:

```text
connect-src 'self' https://hub.scanupload.net wss://hub.scanupload.net;
```

`https://` permits the session API request; `wss://` permits the SignalR negotiate and WebSocket traffic. CSP does not infer `wss://` permission from an `https://` entry. Add other origins only when your application needs them. The included Nginx configuration receives these sources through `CONNECT_SRC`; use the equivalent `connect-src` directive in Apache, IIS, a CDN, or your application server.

If you use Cloudflare Web Analytics, retain `https://static.cloudflareinsights.com` in `script-src`. `frame-src` controls frames your page opens; it does not grant permission for another site to embed your page.

Inspect the **document** response in browser DevTools, not just a JavaScript asset. Multiple CSP headers are all enforced. `Content-Security-Policy-Report-Only` logs a warning without blocking, so check whether an extension, CDN, or reverse proxy adds a second policy.

### CORS, SignalR, and proxies

- Register the exact public application origin in ScanUpload: scheme, hostname, and port must all match. `https://app.example.com` and `https://app.example.com:443` are not interchangeable in every CORS configuration.
- Serve the application over HTTPS. An HTTPS page can use `wss://`; an HTTP page will be blocked from connecting to the secure hub by mixed-content rules.
- These Vite examples connect directly to the hub. A reverse proxy is not required. If you introduce one, forward the browser `Origin` header and enable WebSocket upgrade forwarding for the SignalR route (`Upgrade` and `Connection` headers).
- A session API success followed by a failed SignalR negotiation usually means `wss://hub.scanupload.net` is missing from CSP, the allowed origin list, or proxy WebSocket support.

### Configuration and diagnostics

Vite replaces `VITE_SESSION_URL` and `VITE_CLIENT_ID` when it builds the JavaScript bundle. Changing container runtime environment variables after the image is built does not change the deployed app; rebuild the image with the new values. Never expose a client secret through a `VITE_*` variable.

In DevTools, check the Console for CSP and mixed-content errors, then check Network for the session request and SignalR `negotiate` request. The response headers and the request's `Origin` value identify the policy or CORS layer that must be updated.

## What it shows

- An "Example Form" settings panel above the widget with:
    - Checkboxes for **Show Logo**, **Click QR code to reload**, and **Show header**
    - A text field for the header text
    - Radio groups for **File preview mode** (list/grid) and **Qr Code size** (small/medium/large/X-Large — mapped to the `"xlarge"` prop value)
- The QR code, loading overlay, and error overlay
- The "Download all files" button (via `showDownloadButton: true`)

Every change in the panel is wired directly to the widget via `widget.setOptions(...)` — toggling a checkbox or picking a different size updates the QR code live.

## Files

- `src/main.ts` — instantiates `QrCodeGeneratorElement` and wires the form controls to `setOptions`
- `index.html` — host page with the settings form and `<div id="widget-container">` mount point
- `src/index.css` — base layout + utility classes for the form controls
- `.env` / `.env.example` — environment configuration
