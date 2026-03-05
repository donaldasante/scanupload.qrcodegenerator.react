import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

if (import.meta.env.PROD) {
  console.log = () => {};
}

import "./index.css";
import { QrCodeGenerator } from "./QrCodeGenerator";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex items-center justify-center min-h-screen min-w-screen bg-gray-100">
      <form className="bg-white shadow-lg rounded-lg p-8  max-w-md">
        <QrCodeGenerator
          sessionUrl="/scanupload-api/session"
          refreshTokenUrl="/scanupload-api/token"
          showHeader={true}
          header="Upload files from mobile device"
          size="large"
          showLogo={true}
          clickQrCodeToReload={true}
          filePreviewMode="grid"
          classNames={{
            qrWrapper: "rounded-none border-solid border-blue-500",
            reloadButton: "bg-red-500 hover:bg-red-700",
            header: "text-2xl font-bold text-purple-700",
          }}
        />
      </form>
    </div>
  </StrictMode>,
);
