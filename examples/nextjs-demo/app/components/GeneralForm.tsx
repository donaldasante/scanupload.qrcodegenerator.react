"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import XHRUpload from "@uppy/xhr-upload";
import ScanUploadPlugin from "@scanupload/qr-code-generator-uppy";
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import type { QrCodeGeneratorCore } from "@scanupload/qr-code-generator-core";

// The Uppy Dashboard ships its own stylesheet. Without it the Dashboard renders
// as unstyled HTML — a native "browse files" button, a stray "Powered by Uppy"
// link, and content stacked at the top of a mostly empty box.
//
// This import group is the whole cascade, in order: Uppy, then the package, then
// this demo's overrides. `globals.css` comes from the root layout and lands
// before all of it, so anything that has to beat the package stylesheet has to
// be imported here — which is why `override.css` is not part of `globals.css`.
import "@uppy/dashboard/css/style.min.css";
import "@scanupload/qr-code-generator-react/dist/index.css";
import "../override.css";

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
/** Where Uppy sends files. Defaults to the mock route handler in `app/demo-upload`. */
const uploadEndpoint = process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT || "/demo-upload";

type FilePreviewMode = "list" | "grid";
type QrCodeSize = "small" | "medium" | "large" | "xlarge";

const sizeOptions: { value: QrCodeSize; label: string }[] = [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
    { value: "xlarge", label: "X-Large" }
];

/** The drop badge shown over the empty drop zone. */
function DropBadge() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-icon"
            aria-hidden="true"
        >
            <path d="M12 3v12"></path>
            <path d="m17 8-5-5-5 5"></path>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        </svg>
    );
}

export default function GeneralForm() {
    // ── Widget controls ─────────────────────────────────────────────────────

    const [showQrCodeLogo, setShowQrCodeLogo] = useState(true);
    const [clickQrcodeReload, setClickQrcodeReload] = useState(true);
    const [showHeader, setShowHeader] = useState(true);
    /**
     * Off by default: the button operates on the widget's file list, which is
     * only rendered when `showFilePreviews` is on. With previews off there is
     * nothing for it to act on, so it would sit there disabled.
     */
    const [showDownloadButton, setShowDownloadButton] = useState(false);
    /**
     * Off by default: Uppy renders everything the phone sends, so the widget's
     * own list would show the same files twice. Turn it on to exercise the
     * widget's preview list (and the two controls above it) instead.
     */
    const [showFilePreviews, setShowFilePreviews] = useState(false);
    const [filePreviewMode, setFilePreviewMode] = useState<FilePreviewMode>("list");
    const [headerText, setHeaderText] = useState("Scan to upload");
    const [qrCodeSize, setQrCodeSize] = useState<QrCodeSize>("large");

    // ── Uppy + ScanUpload wiring ────────────────────────────────────────────
    //
    // The plugin owns the ScanUpload session and hands every file the phone
    // sends to Uppy. The widget below renders the QR code for that same core, so
    // both halves feed one Uppy instance and upload to the same place.
    const [core, setCore] = useState<QrCodeGeneratorCore | null>(null);
    const [uppyFileCount, setUppyFileCount] = useState(0);

    const uppyContainer = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!uppyContainer.current) return;

        const instance = new Uppy({
            autoProceed: true,
            allowMultipleUploadBatches: true
        });

        // Everything the hub receives from the phone is added to Uppy here,
        // through the same `addFile()` path the drop zone below ends up using.
        instance.use(ScanUploadPlugin, { sessionUrl, clientId });

        // Where Uppy sends files from either source. Swap for @uppy/tus or
        // @uppy/aws-s3 without touching the ScanUpload plugin.
        instance.use(XHRUpload, {
            endpoint: uploadEndpoint,
            fieldName: "file",
            getResponseData(xhr) {
                try {
                    return JSON.parse(xhr.responseText || "{}");
                } catch {
                    return { url: "uploaded" };
                }
            }
        });

        // The Dashboard is the "drop files from this device" half. The plugin is
        // headless, so Uppy works without it too.
        instance.use(Dashboard, {
            inline: true,
            target: uppyContainer.current,
            width: "100%",
            // Fill the host rather than a fixed size. Uppy writes this as an
            // inline style, so the host is what globals.css controls — and the
            // host mirrors the QR square's measured height.
            height: "100%"
        });

        const syncUppyFileCount = (): void => {
            setUppyFileCount(instance.getFiles().length);
        };

        instance.on("file-added", syncUppyFileCount);
        instance.on("file-removed", syncUppyFileCount);
        instance.on("cancel-all", syncUppyFileCount);

        const plugin = instance.getPlugin<ScanUploadPlugin>("ScanUpload");
        setCore(plugin?.getCore() ?? null);

        // Next enables React StrictMode in development, which mounts effects
        // twice; destroying here keeps the second mount clean rather than
        // leaving two sessions running.
        return () => {
            instance.destroy();
            setCore(null);
            setUppyFileCount(0);
        };
    }, []);

    // ── Panel sizing ────────────────────────────────────────────────────────
    //
    // The drop zone mirrors the QR square, so the two panels read as level: it
    // starts on the square's line and is never shorter than it. Both figures are
    // published on the upload box as `--scan-height` / `--scan-offset`.
    //
    // The dashed QR square is measured rather than the whole widget — the drop
    // zone lines up with the code, not with the header above it or the reload
    // hint below.
    const uploadBox = useRef<HTMLElement | null>(null);
    const scanHost = useRef<HTMLDivElement | null>(null);
    const scanObserver = useRef<ResizeObserver | null>(null);
    const observedSquare = useRef<Element | null>(null);

    const measureScan = useCallback((): void => {
        const host = scanHost.current;
        const box = uploadBox.current;
        if (!host || !box) return;

        const square = host.querySelector<HTMLElement>(".sqg-qr-wrapper") ?? host;
        const squareBox = square.getBoundingClientRect();

        box.style.setProperty("--scan-height", `${Math.round(squareBox.height)}px`);
        box.style.setProperty(
            "--scan-offset",
            `${Math.round(squareBox.top - host.getBoundingClientRect().top)}px`
        );

        // Re-point the observer rather than leaving it watching a detached node,
        // in case the widget ever swaps the square for a new element.
        if (square !== observedSquare.current) {
            if (observedSquare.current) scanObserver.current?.unobserve(observedSquare.current);
            scanObserver.current?.observe(square);
            observedSquare.current = square;
        }
    }, []);

    // The widget sits behind `{core && …}`, so it arrives after the first render.
    useEffect(() => {
        const host = scanHost.current;
        if (!host) return;

        const observer = new ResizeObserver(measureScan);
        scanObserver.current = observer;
        observer.observe(host);
        measureScan();

        return () => {
            observer.disconnect();
            scanObserver.current = null;
            observedSquare.current = null;
        };
    }, [core, measureScan]);

    // The controls resize the square, and crossing the `66rem` breakpoint
    // restacks the panels without changing the size of either element — so
    // neither is caught by the observer above.
    useEffect(() => {
        measureScan();
        window.addEventListener("resize", measureScan);
        return () => window.removeEventListener("resize", measureScan);
    }, [qrCodeSize, showHeader, clickQrcodeReload, measureScan]);

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

                        <div className="checkbox-row">
                            <input
                                id="checkFilePreviews"
                                type="checkbox"
                                checked={showFilePreviews}
                                onChange={() => setShowFilePreviews(!showFilePreviews)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                            />
                            <label htmlFor="checkFilePreviews" className="text-sm font-medium text-gray-700 select-none cursor-pointer w-40 text-left">
                                Show file previews
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
                            <div className="flex flex-row items-start mt-2 space-x-4">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="file-preview-mode"
                                        checked={filePreviewMode === "list"}
                                        onChange={() => setFilePreviewMode("list")}
                                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
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
                                        onChange={() => setFilePreviewMode("grid")}
                                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                        Grid
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-0 mt-2">
                            <div className="text-sm font-medium text-gray-700 select-none cursor-pointer text-left">
                                Qr Code size
                            </div>
                            <div className="flex flex-row items-start mt-2 space-x-4">
                                {/* items-start (not items-center) so the radio stays
                                    aligned at the top of the label, even when the
                                    label text wraps to two lines like "X-Large". */}
                                {sizeOptions.map((size) => (
                                    <label key={size.value} className="flex items-start cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="qr-code-size"
                                            checked={qrCodeSize === size.value}
                                            onChange={() => setQrCodeSize(size.value)}
                                            className="h-4 w-4 mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                                            {size.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/*
                One card, two panels: the QR code for uploads from a phone on the
                left, the Uppy Dashboard for files from this device on the right.
            */}
            <section className="upload-box" ref={uploadBox}>
                <div className="half">
                    <h2 className="half-title">From your phone</h2>
                    {core ? (
                        <div className="scan-widget" ref={scanHost}>
                            {/* `core` binds this widget to the plugin's session
                                instead of opening a second one, so this QR code is
                                the one Uppy is listening to. */}
                            <QrCodeGenerator
                                sessionUrl={sessionUrl}
                                clientId={clientId}
                                core={core}
                                showHeader={showHeader}
                                header={headerText}
                                size={qrCodeSize}
                                showLogo={showQrCodeLogo}
                                clickQrCodeToReload={clickQrcodeReload}
                                filePreviewMode={filePreviewMode}
                                showDownloadButton={showDownloadButton}
                                showFilePreviews={showFilePreviews}
                            />
                        </div>
                    ) : (
                        <p className="scan-pending">Connecting…</p>
                    )}
                </div>

                <div className="half">
                    <h2 className="half-title">From this device</h2>
                    <div className={`uppy-shell${uppyFileCount > 0 ? " has-files" : ""}`}>
                        <div className="uppy-host" ref={uppyContainer}></div>
                        {uppyFileCount === 0 && <DropBadge />}
                    </div>
                </div>
            </section>

            <p className="demo-back-link">
                <a href="https://app.scanupload.net/" className="text-blue-600 hover:text-blue-800 underline">
                    Back to ScanUpload
                </a>
            </p>
        </>
    );
}
