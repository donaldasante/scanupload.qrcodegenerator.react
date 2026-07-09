# Next.js Packages

This folder contains Next.js-focused packages for ScanUpload integrations.

## Structure

```
packages/next-js/
  server/
    package.json
    src/
      index.ts
      scanupload.ts
      proxy.ts
      download.ts
```

## Server Package

Package name: `@scanupload/qr-code-generator-nextjs-server`

Purpose:

- Reads ScanUpload and Keycloak environment configuration
- Retrieves and caches access tokens
- Provides helpers for proxying requests to ScanUpload
- Provides helpers for downloading and zipping session files

The package is framework-agnostic at runtime and can be used by Next.js Route Handlers.

## Typical Use in Next.js

```ts
import {
    getAccessToken,
    isTokenRequest,
    forwardToScanUpload,
    buildResponseHeaders,
    fetchSessionZip
} from '@scanupload/qr-code-generator-nextjs-server';
```

## Environment Variables

The server package reads these environment variables:

- `SCANUPLOAD_CLIENT_ID`
- `SCANUPLOAD_CLIENT_SECRET`
- `SCANUPLOAD_FRONTEND_BASE_URL` (optional)
- `SCANUPLOAD_KEYCLOAK_URL` (optional)
- `SCANUPLOAD_KEYCLOAK_REALM` (optional)
- `SCANUPLOAD_KEYCLOAK_SCOPE` (optional)

Defaults are applied for optional values to match ScanUpload hosted endpoints.

## Notes

- Keep Next.js-specific request and response wiring in app route handlers.
- Keep reusable token, proxy, and download logic inside `packages/next-js/server`.
