# Next.js App Router demo

A minimal Next.js (App Router) app that integrates [`@scanupload/qr-code-generator-react`](../../packages/react). The session API request uses the included `/hub-api` rewrite; SignalR still needs to be allowed by the browser and any proxy in front of the app.

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
NEXT_PUBLIC_SESSION_URL=/hub-api/api/v2/front-end/session
NEXT_PUBLIC_HUB_API_TARGET=https://hub.scanupload.net
NEXT_PUBLIC_CLIENT_ID=your-tenant-id
```

`NEXT_PUBLIC_SESSION_URL` is the browser-visible route. `next.config.ts` rewrites `/hub-api/*` to `NEXT_PUBLIC_HUB_API_TARGET`; set the target to the hub base URL without a trailing slash. The hub authenticates from the browser's `Origin` header.

## Get a client ID

1. Log in or sign up to the [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any client-side env file. The browser only needs the client ID.

## Local development and allowed origins

When testing on `localhost`, open the client configuration in the [ScanUpload Dashboard](https://app.scanupload.net/dashboard) and enable **Test Mode**. Test Mode bypasses origin validation so the local HTTPS development server can create a session.

Without it, the session request can fail with an error like:

```text
The origin 'https://localhost:3000' is not in the AllowedOrigins list for tenant '...'.
```

Before deploying, disable **Test Mode** and add the exact public site origin to **Allowed Origins**, for example `https://your-site.example`. Origins are scheme, host, and port specific; add each environment separately. Do not leave Test Mode enabled in production.

## Production troubleshooting

The session API request is same-origin when you use the supplied `/hub-api` rewrite, but the widget still uses SignalR and can receive an absolute hub URL. Test the API request and SignalR negotiation separately in DevTools.

### CSP

Allow the hub WebSocket in `connect-src`; also allow the hub HTTPS origin when you use a direct session URL or the hub returns an absolute negotiate URL:

```text
connect-src 'self' https://hub.scanupload.net wss://hub.scanupload.net;
```

`https://` permits HTTP(S) session and negotiate requests; `wss://` permits SignalR WebSockets. CSP does not infer `wss://` permission from `https://`. Configure this directive at the server, CDN, or hosting platform that serves your document. Do not relax the policy to `connect-src *`.

Inspect the **document** response in browser DevTools. All CSP headers are enforced together; a `Content-Security-Policy-Report-Only` header only logs, so a browser extension, CDN, or reverse proxy may add warnings even when it does not block the request.

### CORS, SignalR, and proxies

- Register the exact public application origin in ScanUpload, including its scheme, hostname, and non-default port.
- Use HTTPS in production. An HTTP page cannot establish a secure `wss://` connection without mixed-content restrictions.
- Keep the `/hub-api` rewrite when you want a same-origin session request. If a CDN or reverse proxy handles that route instead, preserve the browser `Origin` header.
- When a proxy carries SignalR traffic, it must allow WebSocket upgrades (`Upgrade` and `Connection` headers) and use timeouts appropriate for persistent connections.
- A successful session request followed by a failed `negotiate` request normally indicates missing CSP permission, an unregistered origin, or blocked WebSocket upgrades.

### Configuration and diagnostics

`NEXT_PUBLIC_*` values are exposed to browser code. Do not place a client secret in any `NEXT_PUBLIC_*` variable. Rebuild/redeploy when changing values that Next.js inlines into the client bundle; restart the server after changing the rewrite target.

Use the Console to find CSP and mixed-content failures. In Network, inspect the session request, `negotiate` request, and WebSocket connection, including their response headers and the browser-sent `Origin` value.

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
