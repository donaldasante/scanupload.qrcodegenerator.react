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
     * Endpoint that streams all uploaded files for a session as a ZIP
     * archive. Hit via `GET <url>?session_id=<id>`; auth is enforced by
     * the hub's `FrontEndSessionPolicy`.
     */
    readonly VITE_DOWNLOAD_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default component;
}
