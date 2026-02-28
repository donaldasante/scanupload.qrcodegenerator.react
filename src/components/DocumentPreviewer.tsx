import React from "react";
import {
  FileText,
  FileImage,
  File,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileType,
  FileDigit,
  FileJson,
  FileImage as ImageIcon, // Alias to avoid conflict with Image component
} from "lucide-react";
import { CiSquareRemove } from "react-icons/ci";

import {
  FileText as FileWord, // For .doc, .docx
  FileSpreadsheet as FileExcel, // For .xls, .xlsx
  Presentation as FilePowerpoint, // For .ppt, .pptx
  File as FilePdf, // For .pdf
} from "lucide-react";
import ProgressBar from "./ProgressBar";
import { UploadedFile } from "../QrCodeGenerator";

interface DocumentPreviewerProps {
  file: UploadedFile;
  size?: "sm" | "md" | "lg" | "xlg";
  className?: string;
  showExtension?: boolean;
  showRemoveButton?: boolean;
  removeFileMethod?: (fileId: string) => void;
}

export const DocumentPreviewer: React.FC<DocumentPreviewerProps> = ({
  file,
  size = "md",
  className = "",
  showExtension = true,
  showRemoveButton = false,
  removeFileMethod = () => {},
}) => {
  // Get file extension from filename
  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  };

  // Get icon component based on file extension
  const getIconByExtension = (extension: string) => {
    const baseProps = {
      className: "text-gray-600",
    };

    switch (extension) {
      // Documents
      case "pdf":
        return <FilePdf {...baseProps} className="text-red-500" />;

      case "doc":
      case "docx":
        return <FileWord {...baseProps} className="text-blue-500" />;

      case "xls":
      case "xlsx":
        return <FileExcel {...baseProps} className="text-green-600" />;

      case "csv":
        return <FileSpreadsheet {...baseProps} className="text-green-500" />;

      case "ppt":
      case "pptx":
        return <FilePowerpoint {...baseProps} className="text-orange-500" />;

      case "txt":
      case "rtf":
        return <FileText {...baseProps} className="text-gray-600" />;

      case "md":
        return <FileDigit {...baseProps} />;

      // Images
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "bmp":
      case "webp":
      case "ico":
        return <FileImage {...baseProps} className="text-purple-500" />;

      // Videos
      case "mp4":
      case "avi":
      case "mov":
      case "wmv":
      case "flv":
      case "webm":
      case "mkv":
        return <FileVideo {...baseProps} className="text-purple-600" />;

      // Audio
      case "mp3":
      case "wav":
      case "ogg":
      case "flac":
      case "m4a":
      case "aac":
        return <FileAudio {...baseProps} className="text-pink-500" />;

      // Archives
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
      case "bz2":
        return <FileArchive {...baseProps} className="text-yellow-600" />;

      // Code & Data
      case "js":
      case "jsx":
        return <FileCode {...baseProps} className="text-yellow-500" />;

      case "ts":
      case "tsx":
        return <FileType {...baseProps} className="text-blue-600" />;

      case "html":
      case "htm":
        return <FileCode {...baseProps} className="text-orange-600" />;

      case "css":
        return <FileCode {...baseProps} className="text-blue-400" />;

      case "json":
        return <FileJson {...baseProps} className="text-gray-700" />;

      case "xml":
      case "yml":
      case "yaml":
        return <FileCode {...baseProps} className="text-gray-600" />;

      // Default
      default:
        return <File {...baseProps} />;
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: 20,
      textSize: "text-xs",
      containerSize: "w-full max-w-40 h-auto",
      filenameSize: "text-xs",
      textTruncateSize: "90px",
      previewSize: "h-12 w-20",
    },
    md: {
      iconSize: 32,
      textSize: "text-sm",
      containerSize: "w-full max-w-52 h-auto",
      filenameSize: "text-xs",
      textTruncateSize: "100px",
      previewSize: "h-16 w-20",
    },
    lg: {
      iconSize: 45,
      textSize: "text-base",
      containerSize: "w-full max-w-60 h-auto",
      filenameSize: "text-xs",
      textTruncateSize: "100px",
      previewSize: "h-20 w-20",
    },
    xlg: {
      iconSize: 56,
      textSize: "text-base",
      containerSize: "w-full max-w-70 h-auto",
      filenameSize: "text-xs",
      textTruncateSize: "100px",
      previewSize: "h-23 w-24",
    },
  };

  const { iconSize, textSize, previewSize } = sizeConfig[size];
  const extension = getFileExtension(file.name);
  const IconComponent = getIconByExtension(extension);

  return (
    <div className={`flex flex-col items-center ${className} mt-2 gap-1`}>
      <div
        className={`group flex max-w-[160px] cursor-default flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-colors duration-200 hover:bg-gray-50 hover:shadow-md sm:max-w-[180px] md:max-w-[200px]`}
      >
        {file.thumbnailBase64 ? (
          <div
            className={`${previewSize} w-20 transform overflow-hidden rounded transition-transform duration-200 group-hover:scale-110`}
          >
            <img
              src={`data:${file.type};base64,${file.thumbnailBase64}`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <>
            <div className="mb-2 transform transition-transform duration-200 group-hover:scale-110">
              {React.cloneElement(IconComponent, { size: iconSize })}
            </div>
            {showExtension && extension && (
              <div
                className={`${textSize} px-1 text-center font-medium break-all`}
              >
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-gray-700">
                  {extension.toUpperCase()}
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex flex-row items-center justify-between gap-1 p-2">
          <div className="mt-1">
            <p className="w-25 truncate text-start text-xs font-medium text-gray-800">
              {file.name}
            </p>
            <p className="text-start text-xs text-gray-500">
              ({(file.size / 1024).toFixed(1)} KB)
            </p>
          </div>
          {showRemoveButton && (
            <button
              className="h-6 w-6 rounded-md p-0 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Remove File"
              onClick={() => removeFileMethod(file.id)}
            >
              <CiSquareRemove className="h-10 w-10 text-gray-400" />
            </button>
          )}
        </div>
        <ProgressBar progress={file.progress} />
      </div>
    </div>
  );
};
