# @scanupload/qr-code-generator-core

Framework-agnostic runtime for the ScanUpload QR Code Generator. Handles session creation, SignalR connection management, upload state, and the typed primitives needed to build framework adapters.

## Install

```bash
npm install @scanupload/qr-code-generator-core
```

## Backend contract

The browser calls one endpoint directly — the hub authenticates from the browser's `Origin` header, so no token is required.

| Endpoint     | Method | Description                                                                                |
| ------------ | ------ | ------------------------------------------------------------------------------------------ |
| `sessionUrl` | `POST` | Creates a ScanUpload session. Returns `{ sessionId, deviceLoginUrl, hubUrl, ttlSeconds }`. |

## Quick start

```ts
import { QrCodeGeneratorCore, browserStorageAdapter } from '@scanupload/qr-code-generator-core';

const core = new QrCodeGeneratorCore({
    sessionUrl: '/api/front-end/session',
    clientId: 'your-tenant-id', // optional
    storage: browserStorageAdapter // optional, defaults to localStorage
});

const unsubscribe = core.subscribe(() => {
    const state = core.getState();
    console.log({
        deviceLoginUrl: state.deviceLoginUrl,
        secondsRemaining: state.secondsRemaining,
        files: state.uploadedFiles
    });
});

await core.start();

// Update at runtime — the core reconnects automatically
await core.setOptions({ sessionUrl: '/api/new-session' });

// Tear down
unsubscribe();
core.dispose();
```

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
    status: 'added' | 'uploading' | 'success' | 'error';
    error?: string;
    url?: string; // signed download URL — used by DownloadButton
    thumbnailBase64?: string;
}
```

### Methods

- `start()` — create the session and open the SignalR connection
- `setOptions({ sessionUrl?, clientId? })` — update at runtime; reconnects automatically
- `retrySession()` — tear down the current session and create a new one
- `getState()` / `subscribe(listener)` — reactive state
- `dispose()` — clean up

## Exports

- `QrCodeGeneratorCore`
- `browserStorageAdapter`
- `triggerBrowserDownload(blob, filename)` — browser-only DOM helper
- `postData`, `deleteData`, `ApiError`
- `isNullOrEmpty`, `debounce`, `debounceAsync`, `isExpired`, `truncateWithDots`
- `SessionResponse`, `UploadedFile`, `QrCodeGeneratorState`
- `StorageAdapter`, `QrCodeGeneratorCoreOptions`, `QrCodeGeneratorCoreSetOptions`

## License

MIT © Donald Asante
