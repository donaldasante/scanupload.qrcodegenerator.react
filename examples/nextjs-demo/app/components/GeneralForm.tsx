"use client";

import React, { useState } from "react";
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import "@scanupload/qr-code-generator-react/dist/index.css";

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
    <div className="bg-gray-100">
      <div className="flex items-center justify-center min-h-screen min-w-screen">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-center mb-2">Example Form</h2>

          <div className="mb-6">
            <h6 className="block text-sm font-medium text-left text-gray-700 mb-3">
              QR Code generator options
            </h6>
            <div className="flex flex-col items-left space-x-1">
              <div className="flex items-center gap-0">
                <input
                  id="checkQrCodeLogo"
                  type="checkbox"
                  checked={showQrCodeLogo}
                  onChange={() => setShowQrCodeLogo(!showQrCodeLogo)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                />
                <label
                  htmlFor="checkQrCodeLogo"
                  className="text-sm font-medium text-gray-700 select-none cursor-pointer w-20 text-left"
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
                  className="text-sm font-medium text-gray-700 select-none cursor-pointer w-25 text-left"
                >
                  Show header
                </label>
              </div>

              <div className="flex items-center mt-4">
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

              <div className="flex flex-col gap-0 mt-4">
                <div className="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                  File preview mode
                </div>
                <div className="flex flex-row items-start">
                  <div className="flex flex-row items-start mt-3 space-x-4">
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

              <div className="flex flex-col gap-0 mt-4">
                <div className="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                  Qr Code size
                </div>
                <div className="flex flex-row items-start">
                  <div className="flex flex-row items-start mt-3 space-x-4">
                    {(["small", "medium", "large", "xlarge"] as const).map(
                      (size) => (
                        <label
                          key={size}
                          className="flex items-center cursor-pointer group"
                        >
                          <input
                            type="radio"
                            name="qr-code-size"
                            checked={qrCodeSize === size}
                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            onChange={() => setQrCodeSize(size)}
                          />
                          <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors capitalize">
                            {size === "xlarge"
                              ? "Extra Large"
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
              sessionUrl={process.env.NEXT_PUBLIC_SESSION_URL}
              clientId={process.env.NEXT_PUBLIC_CLIENT_ID}
              showHeader={showHeader}
              header={headerText}
              size={qrCodeSize}
              showLogo={showQrCodeLogo}
              clickQrCodeToReload={clickQrcodeReload}
              filePreviewMode={filePreviewMode}
              showDownloadButton={true}
            />
          </div>

          <p className="mt-4 text-center text-sm">
            <a
              href="https://app.scanupload.net/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Back to ScanUpload
            </a>
          </p>

          <p className="mt-4 text-center text-sm text-gray-500">
            View the{" "}
            <a
              href="https://github.com/donaldasante/scanupload.example.dotnet-and-react"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              source code on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}