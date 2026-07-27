import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";

if (import.meta.env.PROD) {
  console.log = () => {};
}

// When overriding styles, import the base CSS then your overrides.
import "@scanupload/qr-code-generator-react/dist/index.css";
import "./index.css";
import "./override.css";

// Endpoints + client id live in `.env` / `.env.local`. See `.env.example`.
function readSessionUrl(): string {
  const value = import.meta.env.VITE_SESSION_URL;
  if (!value) {
    throw new Error(
      "VITE_SESSION_URL is not set. Copy .env.example to .env.local or provide it as a Docker build argument.",
    );
  }
  return value;
}

function readClientId(): string {
  const value = import.meta.env.VITE_CLIENT_ID;
  if (!value) {
    throw new Error(
      "VITE_CLIENT_ID is not set. Copy .env.example to .env.local or provide it as a Docker build argument.",
    );
  }
  return value;
}

const sessionUrl = readSessionUrl();
const clientId = readClientId();

type FilePreviewMode = "list" | "grid";
type QrCodeSize = "small" | "medium" | "large" | "xlarge";

function App() {
  const [showQrCodeLogo, setShowQrCodeLogo] = useState(true);
  const [clickQrcodeReload, setClickQrcodeReload] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [showDownloadButton, setShowDownloadButton] = useState(true);
  const [filePreviewMode, setFilePreviewMode] = useState<FilePreviewMode>("list");
  const [headerText, setHeaderText] = useState("Scan to upload");
  const [qrCodeSize, setQrCodeSize] = useState<QrCodeSize>("large");

  return (
    <>
      <h2 className="demo-title">Example Form</h2>
      <div className="demo-card">
      <div className="mb-6">
        <div className="flex flex-col">
          <div className="checkbox-row">
            <input
              id="checkQrCodeLogo"
              type="checkbox"
              checked={showQrCodeLogo}
              onChange={() => setShowQrCodeLogo(!showQrCodeLogo)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
            />
            <label htmlFor="checkQrCodeLogo" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
              Show Logo
            </label>
          </div>

          <div className="checkbox-row">
            <input
              id="checkClickReload"
              type="checkbox"
              checked={clickQrcodeReload}
              onChange={() => setClickQrcodeReload(!clickQrcodeReload)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
            />
            <label htmlFor="checkClickReload" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
              Click QR code to reload
            </label>
          </div>

          <div className="checkbox-row">
            <input
              id="checkHeader"
              type="checkbox"
              checked={showHeader}
              onChange={() => setShowHeader(!showHeader)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
            />
            <label htmlFor="checkHeader" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
              Show header
            </label>
          </div>

          <div className="checkbox-row">
            <input
              id="checkDownloadButton"
              type="checkbox"
              checked={showDownloadButton}
              onChange={() => setShowDownloadButton(!showDownloadButton)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
            />
            <label htmlFor="checkDownloadButton" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
              Show download button
            </label>
          </div>

          <div className="flex items-center mt-2">
            <label htmlFor="headerText" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left">
              Header text
            </label>
            <input
              id="headerText"
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              className="w-60 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-400"
              placeholder="Enter header text"
            />
          </div>

          <div className="flex flex-col gap-0 mt-2">
            <div className="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
              File preview mode
            </div>
            <div className="flex flex-row items-start">
              <div className="flex flex-row items-start mt-2 space-x-4">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="file-preview-mode"
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    checked={filePreviewMode === "list"}
                    onChange={() => setFilePreviewMode("list")}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                    List
                  </span>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="file-preview-mode"
                    checked={filePreviewMode === "grid"}
                    className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    onChange={() => setFilePreviewMode("grid")}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                    Grid
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0 mt-2">
            <div className="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
              Qr Code size
            </div>
            <div className="flex flex-row items-start">
              <div className="flex flex-row items-start mt-2 space-x-4">
                {(["small", "medium", "large", "xlarge"] as const).map((size) => (
                  <label key={size} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="qr-code-size"
                      checked={qrCodeSize === size}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      onChange={() => setQrCodeSize(size)}
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors capitalize">
                      {size === "xlarge" ? "Extra Large" : size.charAt(0).toUpperCase() + size.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <QrCodeGenerator
          sessionUrl={sessionUrl}
          clientId={clientId}
          showHeader={showHeader}
          header={headerText}
          size={qrCodeSize}
          showLogo={showQrCodeLogo}
          clickQrCodeToReload={clickQrcodeReload}
          filePreviewMode={filePreviewMode}
          showDownloadButton={showDownloadButton}
        />
      </div>

      </div>
      <p className="demo-back-link">
        <a href="https://app.scanupload.net/" className="text-blue-600 hover:text-blue-800 underline">
          Back to ScanUpload
        </a>
      </p>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
