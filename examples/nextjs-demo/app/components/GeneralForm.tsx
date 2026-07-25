"use client";

import { useState } from "react";
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import "@scanupload/qr-code-generator-react/dist/index.css";

// `process.env.NEXT_PUBLIC_*` is typed as `string | undefined` by Next.js
// even though it's defined at build time. Read once at module load and
// narrow with a runtime check so the component treats the value as
// `string`. Failing fast here gives a clearer error than a runtime 401
// from the hub.
function readSessionUrl(): string {
    const value = process.env.NEXT_PUBLIC_SESSION_URL;
    if (!value) {
        throw new Error(
            "NEXT_PUBLIC_SESSION_URL is not set. Copy .env.example to " +
            ".env.local (or .env) and fill in the ScanUpload hub URL."
        );
    }
    return value;
}
const sessionUrl = readSessionUrl();
const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;

export default function GeneralForm() {
  const [showQrCodeLogo, setShowQrCodeLogo] = useState(true);
  const [clickQrcodeReload, setClickQrcodeReload] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [filePreviewMode, setFilePreviewMode] = useState<"list" | "grid">(
    "list",
  );
  const [headerText, setHeaderText] = useState("Scan to upload");
  const [qrCodeSize, setQrCodeSize] = useState<
    "small" | "medium" | "large" | "xlarge"
  >("large");

  return (
    <>
      <h2 className="demo-title">Example Form</h2>
      <div className="demo-card">
        <div className="mb-6">
          <div className="flex flex-col">
            <div className="flex items-center">
              <input
                id="checkQrCodeLogo"
                type="checkbox"
                checked={showQrCodeLogo}
                onChange={() => setShowQrCodeLogo(!showQrCodeLogo)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
              />
              <label
                htmlFor="checkQrCodeLogo"
                className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left"
              >
                Show Logo
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="checkClickReload"
                type="checkbox"
                checked={clickQrcodeReload}
                onChange={() => setClickQrcodeReload(!clickQrcodeReload)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
              />
              <label
                htmlFor="checkClickReload"
                className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left"
              >
                Click QR code to reload
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="checkHeader"
                type="checkbox"
                checked={showHeader}
                onChange={() => setShowHeader(!showHeader)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
              />
              <label
                htmlFor="checkHeader"
                className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left"
              >
                Show header
              </label>
            </div>

            <div className="flex items-center mt-2">
              <label
                htmlFor="headerText"
                className="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left"
              >
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
                  {/* items-start (not items-center) so the radio
                      stays aligned at the top of the label, even
                      when the label text wraps to two lines like
                      "Extra Large". */}
                  {(["small", "medium", "large", "xlarge"] as const).map(
                    (size) => (
                      <label
                        key={size}
                        className="flex items-start cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="qr-code-size"
                          checked={qrCodeSize === size}
                          className="h-4 w-4 mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          onChange={() => setQrCodeSize(size)}
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors capitalize">
                          {size === "xlarge"
                            ? "X-Large"
                            : size.charAt(0).toUpperCase() + size.slice(1)}
                        </span>
                      </label>
                    ),
                  )}
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
            showDownloadButton={true}
          />
        </div>
      </div>
      <p className="demo-back-link">
        <a
          href="https://app.scanupload.net/"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Back to ScanUpload
        </a>
      </p>
    </>
  );
}