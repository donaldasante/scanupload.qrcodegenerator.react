# React + Vite demo

A minimal Vite + React app that integrates [`@scanupload/qr-code-generator-react`](../../packages/react).

## Run

From the monorepo root:

```bash
npm install
npm run build:react
npm run dev:react
```

`build:react` builds the core dependency and the React package before starting
this linked-workspace demo.

The app starts on https://localhost:5173 (HTTPS is required for the hub's `Origin` checks).

## Configure

Copy `.env.example` to `.env` and fill in:

```env
VITE_SESSION_URL=https://hub.scanupload.net/api/v2/front-end/session
VITE_CLIENT_ID=your-tenant-id
```

- `VITE_SESSION_URL` — the endpoint that creates a ScanUpload session.
- `VITE_CLIENT_ID` — required tenant / Keycloak `client_id`.

The browser calls `VITE_SESSION_URL` directly; no client-side proxy is involved.

## Get a client ID

1. Log in or sign up to the [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any client-side env file. The browser only needs the client ID.

## Local development and allowed origins

When testing on `localhost`, open the client configuration in the [ScanUpload Dashboard](https://app.scanupload.net/dashboard) and enable **Test Mode**. Test Mode bypasses origin validation so the local HTTPS development server can create a session.

Without it, the session request can fail with an error like:

```text
The origin 'https://localhost:5173' is not in the AllowedOrigins list for tenant '...'.
```

Before deploying, disable **Test Mode** and add the exact public site origin to **Allowed Origins**, for example `https://your-site.example`. Origins are scheme, host, and port specific; add each environment separately. Do not leave Test Mode enabled in production.

## Production troubleshooting

The browser creates the ScanUpload session with an HTTPS request, then uses SignalR over a secure WebSocket. Most production connection failures are caused by browser security policy or an origin mismatch rather than the React integration.

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
- The "Download all files" button (via `showDownloadButton={true}`)

Every change in the panel is wired directly to the widget — toggling a checkbox or picking a different size updates the QR code live.

## Files

- `src/main.tsx` — mounts the React app and renders the settings form
- `src/index.css` — base layout + utility classes for the form controls
- `src/override.css` — package CSS overrides (themed background, button colour, etc.)
- `.env` / `.env.example` — environment configuration
