export interface QrCodeGeneratorProps {
    sessionUrl: string;
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
