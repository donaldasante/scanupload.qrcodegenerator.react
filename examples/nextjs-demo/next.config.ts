import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: [
        '@scanupload/qr-code-generator-react',
        '@scanupload/qr-code-generator-core'
    ],
    // The dev server runs on HTTPS via `next dev --experimental-https` so the
    // browser sets `Origin` and the SignalR WebSocket upgrade is allowed.
    // Without this, the browser refuses to upgrade a WS connection from an
    // HTTP page (insecure context) — and the hub's mixed-content / CORS
    // checks reject any HTTP→HTTPS fallback.
    //
    // `allowedDevOrigins` whitelists the localhost + LAN hosts the dev
    // server can be reached on. The hub's CORS policy checks the browser's
    // `Origin` header against `session.Dns`, so the dev server's origin
    // must be allowed for `next/image` / fetch() from server components.
    allowedDevOrigins: [
        'localhost',
        '127.0.0.1',
        // `next dev --hostname 0.0.0.0` exposes the server on the LAN; the
        // hub receives the LAN IP as Origin, which Next blocks by default.
        // Add your LAN IP range here if your QA hub allows it.
    ]
};

export default nextConfig;
