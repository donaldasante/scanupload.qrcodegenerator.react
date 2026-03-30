import React from "react";
import { HiOutlineDocument } from "react-icons/hi";
import type { UploadedFile } from "@scanupload/qr-code-generator-core";

interface FileListProps {
  files: UploadedFile[];
}

export const FileList: React.FC<FileListProps> = ({ files }) => {
  return (
    <div className="flex flex-col divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-2 p-2">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
            {file.thumbnailBase64 ? (
              <img
                src={`data:${file.type};base64,${file.thumbnailBase64}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-500">
                <HiOutlineDocument size={24} />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium text-gray-800 truncate w-60">
              {file.name}
            </span>

            <span className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
