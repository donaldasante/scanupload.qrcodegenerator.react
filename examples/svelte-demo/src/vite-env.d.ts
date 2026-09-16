/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * URL the browser POSTs to in order to create a ScanUpload session.
     * The browser's automatic `Origin` header is the only auth the hub needs.
     */
    readonly VITE_SESSION_URL: string;
    /**
     * Tenant / Keycloak `client_id`. Sent in the request body as
     * `{ "clientId": "..." }` so the hub can scope audit, rate-limits,
     * and per-client rules.
     */
    readonly VITE_CLIENT_ID: string;
    /**
     * Optional. Where the demo's Uppy instance uploads files, from either half.
     * Defaults to the mock endpoint defined in `vite.config.js`.
     */
    readonly VITE_UPLOAD_ENDPOINT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
