# @scanupload/qr-code-generator-core

Framework-agnostic runtime for the ScanUpload QR Code Generator. Handles session
creation, SignalR connection management, upload state, and the typed primitives
needed to build framework adapters.

## Install

```bash
npm install @scanupload/qr-code-generator-core
```

## Backend contract

The browser calls one endpoint directly — the hub authenticates from the
browser's `Origin` header, so no token is required. `POST sessionUrl` creates a
session and returns `{ sessionId, deviceLoginUrl, hubUrl, ttlSeconds }`.

## Quick start

```ts
import {
  QrCodeGeneratorCore,
  browserStorageAdapter,
} from "@scanupload/qr-code-generator-core";

const core = new QrCodeGeneratorCore({
  sessionUrl: "/api/front-end/session",
  clientId: "your-client-id", // optional
  storage: browserStorageAdapter, // optional, defaults to localStorage
});

const unsubscribe = core.subscribe(() => {
  const state = core.getState();
  console.log({
    deviceLoginUrl: state.deviceLoginUrl,
    secondsRemaining: state.secondsRemaining,
    files: state.uploadedFiles,
  });
});

await core.start();

// Update at runtime — the core reconnects automatically
await core.setOptions({ sessionUrl: "/api/new-session" });

// Tear down
unsubscribe();
core.dispose();
```

## Get a client ID

The `clientId` option identifies your tenant. Create it in the ScanUpload
Dashboard:

1. Log in or sign up to the
   [ScanUpload Dashboard](https://app.scanupload.net/dashboard).
2. Enter your company name and website URL, then click **Save**.
3. Navigate to the **Client Credentials** section to generate your client ID.

The client secret is only used by server-side integrations — leave it out of any
client-side env file. The browser only needs the client ID.

## API

### `new QrCodeGeneratorCore(options)`

| Field           | Type             | Required | Description                                                                                                                                                     |
| --------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionUrl`    | `string`         | Yes      | Endpoint that creates a ScanUpload session.                                                                                                                     |
| `clientId`      | `string`         | No       | Optional tenant / Keycloak `client_id` sent in the request body.                                                                                                |
| `storage`       | `StorageAdapter` | No       | Defaults to `localStorage` via `browserStorageAdapter`.                                                                                                         |
| `autoResession` | `boolean`        | `true`   | Automatically create a fresh session at TTL expiry. Framework UI wrappers default this to `false` so their disconnected state and Reload action remain visible. |

### State

```ts
interface QrCodeGeneratorState {
  loading: boolean; // true while the session is being created
  isConnected: boolean; // SignalR connection status
  retry: boolean; // true when the last session create failed
  deviceLoginUrl: string; // URL encoded into the QR code
  uploadedFiles: UploadedFile[];
  expiresAt: number | null; // absolute expiry (ms since epoch)
  secondsRemaining: number | null;
  errorCode: number | null; // 409 (tenant limit) / 429 (rate limit) / null
  sessionId: string | null; // active session id
}
```

### `UploadedFile`

```ts
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: "added" | "uploading" | "success" | "error";
  error?: string;
  url?: string; // signed download URL — used by DownloadButton
  thumbnailBase64?: string;
}
```

### Methods

- `start()` — create the session and open the SignalR connection
- `setOptions({ sessionUrl?, clientId? })` — update at runtime; reconnects
  automatically
- `retrySession()` — tear down the current session and create a new one
- `getState()` / `subscribe(listener)` — reactive state
- `on(event, listener)` / `off(event, listener)` — typed file lifecycle events
  (below)
- `dispose()` — clean up

## File lifecycle events

`subscribe()` tells you _something_ changed. `on()` tells you _what_ changed, as
a typed event:

```ts
const off = core.on("file-added", ({ file, origin }) => {
  // origin is 'live' or 'restored'
  console.log(file.name, origin);
});

off(); // unsubscribe
```

| Event           | Payload            | Fires when                                                              |
| --------------- | ------------------ | ----------------------------------------------------------------------- |
| `file-added`    | `{ file, origin }` | The hub reports a file, or a reconnect resync discovers one             |
| `file-removed`  | `{ file }`         | A single file is dropped, and other files remain                        |
| `files-cleared` | `{ files }`        | The list empties — a session reset, the session ending, or a full clear |

The two removal events never overlap: `file-removed` fires only for individual
removals while other files remain, and `files-cleared` only when the list
empties.

`origin` matters when you forward files somewhere else. `'live'` means the hub
pushed the file while you were watching; `'restored'` means it was discovered
during a reconnect resync, so you may want to skip it:

```ts
core.on("file-added", ({ file, origin }) => {
  if (origin === "restored") return;
  // new file, handle it
});
```

Events are not replayed: a listener attached after a file arrived will not see
it. Use `connectScanUploadFiles()` (below) when you need a guaranteed one-shot
pass over the session.

## Materializing a file

`UploadedFile` describes a file; `materializeFile()` fetches it into a real
`File` you can hand to an uploader, a preview, or `FormData`:

```ts
import { materializeFile, toFile } from "@scanupload/qr-code-generator-core";

const { data, url } = await materializeFile(uploadedFile); // data: File, url: string
const file = await toFile(uploadedFile); // the File alone
```

Both reject with `MissingFileUrlError` when the hub has not published a URL yet
(retry later), an `AbortError` when your `signal` fired, or the underlying error
once attempts are exhausted or on a non-retryable status such as `403`.

### Transient 404s are expected

The hub publishes a file's URL when it emits `FileAdded`, and that signal can
precede the blob becoming readable by up to about a second. An immediate `GET`
therefore legitimately returns `404 FileUpload.FileNotFound` for a file that is
perfectly fine.

`materializeFile` retries on a backoff schedule (500, 1000, 2000, 4000, 4000 ms
— about 11.5 s of patience) for `404`, `408`, `423`, `425`, `429`, `5xx` and
network errors. It never retries `400`, `401` or `403`, which are configuration
problems. Tune with `maxAttempts` / `retryDelayMs`, and observe with `onRetry`.

## Feeding another uploader

`connectScanUploadFiles()` is the vendor-neutral fan-out. It owns the parts that
are easy to get wrong and identical for every uploader — downloading each hub
file (with the retry policy above), de-duplicating replays, bounding concurrency
(`maxConcurrentDownloads`, default `4`), mirroring hub-side removals, and
aborting cleanly on `disconnect()` — so an integration only needs a sink: "given
a file, put it here".

```ts
import { connectScanUploadFiles } from "@scanupload/qr-code-generator-core";

const connection = connectScanUploadFiles({
  core,
  sink: {
    add: (file, source, context) => api.attach(file), // return a target id
    remove: (targetId) => api.detach(targetId),
    clear: (entries) => entries.forEach((entry) => api.detach(entry.targetId)),
  },
  onError: (error, file) => console.error(file.name, error),
});

connection.forwarded; // ScanUpload file id -> your id
connection.retryFailed(); // re-attempt files that failed
connection.disconnect(); // on teardown
```

The sink may be sync or async:

```ts
interface ScanUploadFileSink<TTargetId> {
  add(
    data: File | Blob,
    source: UploadedFile,
    context: { url: string },
  ): TTargetId | Promise<TTargetId>;
  remove?(targetId: TTargetId, source: UploadedFile): void | Promise<void>;
  clear?(
    entries: readonly ScanUploadClearedEntry<TTargetId>[],
  ): void | Promise<void>;
}
```

`clear` receives `{ source, targetId }` pairs because the bridge drops its own
records before calling it — without the pairing a sink would need a parallel map
just to know what to remove.

### Closed widgets need an application-owned list

Some uploader widgets expose no API for inserting files you already have —
react-uploader and the Bytescale Upload Widget are the common examples. Those
cannot be driven by a sink, because the widget owns its own file list and only
accepts files the _user_ picked in its own UI. For those, keep the list
yourself: render it from `uploadedFiles`, and drive the widget only for files
the user selects locally.

```ts
const [files, setFiles] = useState<UploadedFile[]>([]);

useEffect(() => {
  if (!core) return;
  setFiles(core.getState().uploadedFiles);
  return core.subscribe(() => setFiles(core.getState().uploadedFiles));
}, [core]);
```

Open widgets — Uppy's Dashboard, for example — do accept programmatic insertion,
which is what the Uppy adapter uses.

## Exports

All runtime values are listed below; see the package's `dist/index.d.ts` for the
full type surface.

- `QrCodeGeneratorCore`, `browserStorageAdapter`
- `connectScanUploadFiles`, `materializeFile`, `toFile`, `MissingFileUrlError`
- `triggerBrowserDownload(blob, filename)` — browser-only DOM helper
- `postData`, `deleteData`, `ApiError`
- `isNullOrEmpty`, `debounce`, `debounceAsync`, `isExpired`, `truncateWithDots`
- `deriveFilename`, `resolveFileIdentity`
- `isRetryableStatus`, `backoffDelayMs`, `isAbortError`, `toError`, `delay`
- `DEFAULT_MAX_DOWNLOAD_ATTEMPTS`, `DEFAULT_DOWNLOAD_RETRY_DELAY_MS`,
  `MAX_DOWNLOAD_RETRY_DELAY_MS`

## License

MIT © Donald Asante
