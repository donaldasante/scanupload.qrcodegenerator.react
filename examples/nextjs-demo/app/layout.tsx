import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanUpload - Next.js example",
  description:
    "Example of using ScanUpload to scan QR codes and upload files from a mobile device in your web app.",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* `#app` is the wrapper the demo stylesheet lays out — the grid of two
          cards on wide screens, one column below 66rem. */}
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  );
}