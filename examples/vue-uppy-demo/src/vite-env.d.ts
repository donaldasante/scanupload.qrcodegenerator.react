/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** URL the browser POSTs to in order to create a ScanUpload session. */
    readonly VITE_SESSION_URL?: string;
    /** Tenant / Keycloak `client_id` sent with the session request. */
    readonly VITE_CLIENT_ID?: string;
    /** Where Uppy uploads the files it receives. Defaults to the dev mock. */
    readonly VITE_UPLOAD_ENDPOINT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
