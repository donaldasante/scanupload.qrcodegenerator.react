import React from "react";
import { HiOutlineDocument } from "react-icons/hi";
import type { UploadedFile } from "@scanupload/qr-code-generator-core";

interface FileListProps {
  files: UploadedFile[];
}

export const FileList: React.FC<FileListProps> = ({ files }) => (
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
