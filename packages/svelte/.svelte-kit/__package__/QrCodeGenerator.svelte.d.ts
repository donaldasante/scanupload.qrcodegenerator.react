export interface QrCodeGeneratorProps {
    sessionUrl: string;
    /**
     * Optional client identifier (tenant / app GUID). Forwarded to the
     * session-create endpoint as `X-Client-Id` so the hub can scope
     * audit, rate-limits, and per-client rules.
     */
    clientId?: string;
    showHeader?: boolean;
    header?: string;
    showLogo?: boolean;
    clickQrCodeToReload?: boolean;
    filePreviewMode?: 'list' | 'grid';
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    /**
     * Show a "Download all files" button beneath the file previews. When
     * clicked, it fetches every `UploadedFile.url` the SignalR hub has
     * surfaced and triggers a browser save for each. Default: false.
     */
    showDownloadButton?: boolean;
}
declare const QrCodeGenerator: import("svelte").Component<QrCodeGeneratorProps, {}, "">;
type QrCodeGenerator = ReturnType<typeof QrCodeGenerator>;
export default QrCodeGenerator;
