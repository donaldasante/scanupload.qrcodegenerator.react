import React from "react";
import { HiOutlineDocument } from "react-icons/hi";
import type { UploadedFile } from "@scanupload/qr-code-generator-core";

interface FileListProps {
    files: UploadedFile[];
}

export const FileList: React.FC<FileListProps> = ({ files }) => {
    // Render nothing when the list is empty. The container's
    // `border: 1px solid #e5e7eb` would otherwise collapse to a
    // 1px-tall empty bordered strip, showing up as a stray horizontal
    // line between the reload section and the download button.
    if (files.length === 0) return null;

    return (
        <div className="sqg-file-list">
            <div className="sqg-file-list-inner">
                {files.map((file) => (
                    <div key={file.id} className="sqg-file-row">
                        <div className="sqg-list-thumb">
                            {file.thumbnailBase64 ? (
                                <img
                                    src={`data:${file.type};base64,${file.thumbnailBase64}`}
                                    alt={file.name}
                                />
                            ) : (
                                <HiOutlineDocument size={24} />
                            )}
                        </div>
                        <div className="sqg-list-info">
                            <span className="sqg-list-name">{file.name}</span>
                            <span className="sqg-list-size">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
