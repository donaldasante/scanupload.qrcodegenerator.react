import { StrictMode } from "react";
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
const sessionUrl = import.meta.env.VITE_SESSION_URL;
const clientId = import.meta.env.VITE_CLIENT_ID;

function App() {
  return (
    <div className="demo-card">
      <h2 className="demo-title">React JS Demo</h2>
      <QrCodeGenerator
        sessionUrl={sessionUrl}
        clientId={clientId}
        showHeader={true}
        header="Upload files from mobile device"
        size="large"
        showLogo={true}
        clickQrCodeToReload={true}
        filePreviewMode="grid"
        showDownloadButton={true}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
