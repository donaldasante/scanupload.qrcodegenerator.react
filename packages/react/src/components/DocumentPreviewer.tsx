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
  FileText as FileWord,
  FileSpreadsheet as FileExcel,
  Presentation as FilePowerpoint,
  File as FilePdf,
} from "lucide-react";
import { CiSquareRemove } from "react-icons/ci";
import ProgressBar from "./ProgressBar";
import type { UploadedFile } from "@scanupload/qr-code-generator-core";

interface DocumentPreviewerProps {
  file: UploadedFile;
  className?: string;
  showExtension?: boolean;
  showRemoveButton?: boolean;
  removeFileMethod?: (fileId: string) => void;
}

export const DocumentPreviewer: React.FC<DocumentPreviewerProps> = ({
  file,
  className = "",
  showExtension = true,
  showRemoveButton = false,
  removeFileMethod = () => {},
}) => {
  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  };

  const getIconByExtension = (extension: string) => {
    switch (extension) {
      case "pdf":                                    return <FilePdf size={40} />;
      case "doc": case "docx":                       return <FileWord size={40} />;
      case "xls": case "xlsx":                       return <FileExcel size={40} />;
      case "csv":                                    return <FileSpreadsheet size={40} />;
      case "ppt": case "pptx":                       return <FilePowerpoint size={40} />;
      case "txt": case "rtf":                        return <FileText size={40} />;
      case "md":                                     return <FileDigit size={40} />;
      case "jpg": case "jpeg": case "png":
      case "gif": case "svg":  case "bmp":
      case "webp": case "ico":                       return <FileImage size={40} />;
      case "mp4": case "avi":  case "mov":
      case "wmv": case "flv":  case "webm":
      case "mkv":                                    return <FileVideo size={40} />;
      case "mp3": case "wav":  case "ogg":
      case "flac": case "m4a": case "aac":           return <FileAudio size={40} />;
      case "zip": case "rar":  case "7z":
      case "tar": case "gz":   case "bz2":           return <FileArchive size={40} />;
      case "js": case "jsx":
      case "html": case "htm":
      case "css": case "xml":
      case "yml": case "yaml":                       return <FileCode size={40} />;
      case "ts": case "tsx":                         return <FileType size={40} />;
      case "json":                                   return <FileJson size={40} />;
      default:                                       return <File size={40} />;
    }
  };

  const extension = getFileExtension(file.name);

  return (
    <div className={`sqg-file-card ${className}`}>
      <div className="sqg-file-inner">
        {file.thumbnailBase64 ? (
          <div className="sqg-thumb-wrap">
            <img
              src={`data:${file.type};base64,${file.thumbnailBase64}`}
              className="sqg-thumb-img"
              alt={file.name}
            />
          </div>
        ) : (
          <>
            <div className="sqg-icon-wrap" data-filetype={extension}>
              {getIconByExtension(extension)}
            </div>
            {showExtension && extension && (
              <div className="sqg-ext-badge">
                <span>{extension.toUpperCase()}</span>
              </div>
            )}
          </>
        )}
        <div className="sqg-file-info">
          <div className="sqg-file-meta">
            <p className="sqg-file-name">{file.name}</p>
            <p className="sqg-file-size">({(file.size / 1024).toFixed(1)} KB)</p>
          </div>
          {showRemoveButton && (
            <button
              className="sqg-remove-btn"
              aria-label="Remove File"
              onClick={() => removeFileMethod(file.id)}
            >
              <CiSquareRemove className="sqg-remove-icon" />
            </button>
          )}
        </div>
        <ProgressBar progress={file.progress} />
      </div>
    </div>
  );
};
