export interface QrCodeGeneratorProps {
    sessionUrl: string;
    /**
     * Optional client identifier (tenant / app GUID). Forwarded to the
     * session-create endpoint as `X-Client-Id` so the hub can scope
     * audit, rate-limits, and per-client rules.
     */
    clientId?: string;
    /**
     * Optional endpoint that streams all uploaded files for a session as a
     * ZIP archive. UIs use this to render a "Download" CTA targeting
     * `GET <downloadUrl>?session_id=<id>`. Auth is enforced by the hub.
     */
    downloadUrl?: string;
    showHeader?: boolean;
    header?: string;
    showLogo?: boolean;
    clickQrCodeToReload?: boolean;
    filePreviewMode?: 'list' | 'grid';
    size?: 'small' | 'medium' | 'large' | 'xlarge';
}
declare const QrCodeGenerator: import("svelte").Component<QrCodeGeneratorProps, {}, "">;
type QrCodeGenerator = ReturnType<typeof QrCodeGenerator>;
export default QrCodeGenerator;
