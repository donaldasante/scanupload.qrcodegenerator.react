import type { UploadedFile } from '@scanupload/qr-code-generator-core';
interface Props {
    file: UploadedFile;
    showExtension?: boolean;
    showRemoveButton?: boolean;
    onRemove?: (fileId: string) => void;
}
declare const DocumentPreviewer: import("svelte").Component<Props, {}, "">;
type DocumentPreviewer = ReturnType<typeof DocumentPreviewer>;
export default DocumentPreviewer;
