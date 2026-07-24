# @scanupload/qr-code-generator-core

Framework-agnostic runtime for the ScanUpload QR Code Generator. This package
handles session creation, token refresh, SignalR connection management, upload
state, and the typed primitives needed to build framework adapters.

## What this package provides

- `QrCodeGeneratorCore` runtime class
- Typed backend contracts and UI state models
- `StorageAdapter` abstraction for persistence
- `browserStorageAdapter` for browser environments
- Small utility and API helper exports

## Installation

```bash
npm install @scanupload/qr-code-generator-core
```

## Backend contract

Your backend must expose one public endpoint. The browser automatically sends
`Origin`, which is what authenticates the request — no token is required.

| Endpoint     | Method | Description                                                                                                                                                  |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sessionUrl` | `POST` | Creates a ScanUpload session and returns `{ sessionId, deviceLoginUrl, hubUrl, ttlSeconds }`. Clients connect directly to `hubUrl` (no proxy/token refresh). |

## Basic usage

```ts
import {
  QrCodeGeneratorCore,
  browserStorageAdapter,
} from "@scanupload/qr-code-generator-core";

const core = new QrCodeGeneratorCore({
  sessionUrl: "/api/front-end/session",
  storage: browserStorageAdapter,
});

const unsubscribe = core.subscribe(() => {
  const state = core.getState();
  // state.deviceLoginUrl  - QR code target (encoded into the QR)
  // state.expiresAt        - absolute expiry timestamp (ms)
  // state.secondsRemaining - live countdown from response.ttlSeconds
  // state.errorCode        - 409 (tenant limit) / 429 (rate limit) / null
  console.log(state.deviceLoginUrl, state.secondsRemaining, state.uploadedFiles);
});

await core.start();

// Update the endpoint at runtime — the core reconnects automatically
await core.setOptions({ sessionUrl: "/api/new-front-end/session" });

// Later
await core.retrySession();

// Cleanup
unsubscribe();
core.dispose();
```

## Public API

### `QrCodeGeneratorCoreOptions`

| Field        | Type             | Required | Description                                                        |
| ------------ | ---------------- | -------- | ------------------------------------------------------------------ |
| `sessionUrl` | `string`         | Yes      | Endpoint used to create a ScanUpload session.                      |
| `clientId`   | `string`         | No       | Optional client identifier sent in the session-create body.         |
| `storage`    | `StorageAdapter` | No       | Optional storage implementation. Defaults to browser localStorage. |

### `QrCodeGeneratorState`

```ts
interface QrCodeGeneratorState {
  loading: boolean;
  isConnected: boolean;
  retry: boolean;
  deviceLoginUrl: string;
  uploadedFiles: UploadedFile[];
  expiresAt: number | null;        // absolute expiry timestamp (ms since epoch)
  secondsRemaining: number | null;  // live countdown, ticks down once per second
  errorCode: number | null;        // 409 (tenant limit) / 429 (rate limit) / null
  sessionId: string | null;        // active session id, null until the first session
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
  url?: string;
  thumbnailBase64?: string;
}
```

### `StorageAdapter`

```ts
interface StorageAdapter {
  getItem<T = unknown>(key: string): T | undefined;
  setItem(key: string, value: unknown): void;
}
```

## Building a custom adapter

Use this package when you want to integrate the QR workflow into another UI
framework.

1. Create a `QrCodeGeneratorCore` instance.
2. Call `start()` when your component or widget initializes.
3. Subscribe to state changes with `subscribe()`.
4. Read the current state with `getState()` and render your UI.
5. Call `retrySession()` to refresh the QR code.
6. Call `dispose()` during teardown.

## Exports

This package exports:

- `QrCodeGeneratorCore`
- `browserStorageAdapter`
- `postData`, `deleteData`, `ApiError`
- `isNullOrEmpty`, `debounce`, `debounceAsync`, `isExpired`, `truncateWithDots`
- `SessionResponse`, `UploadedFile`, `QrCodeGeneratorState`
- `StorageAdapter`, `QrCodeGeneratorCoreOptions`, `QrCodeGeneratorCoreSetOptions`

## License

MIT © Donald Asante
