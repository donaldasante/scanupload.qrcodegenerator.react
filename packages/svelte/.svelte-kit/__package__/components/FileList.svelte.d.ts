import type { UploadedFile } from '@scanupload/qr-code-generator-core';
interface Props {
    files: UploadedFile[];
}
declare const FileList: import("svelte").Component<Props, {}, "">;
type FileList = ReturnType<typeof FileList>;
export default FileList;
