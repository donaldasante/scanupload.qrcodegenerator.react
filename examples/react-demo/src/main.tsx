import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

if (import.meta.env.PROD) {
  console.log = () => {};
}

// When overriding styles, import the base CSS then your overrides,
import "@scanupload/qr-code-generator-react/dist/index.css";
import "./index.css";
import "./override.css";
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="demo-card">
      <h2 className="demo-title">React JS Demo</h2>
      <QrCodeGenerator
        sessionUrl="/scanupload-api/session"
        refreshTokenUrl="/scanupload-api/token"
        showHeader={true}
        header="Upload files from mobile device"
        size="large"
        showLogo={true}
        clickQrCodeToReload={true}
        filePreviewMode="grid"
      />
    </div>
  </StrictMode>,
);
