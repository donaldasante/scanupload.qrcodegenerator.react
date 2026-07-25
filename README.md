# @scanupload/qr-code-generator

A multi-framework QR code generator for the [ScanUpload](https://app.scanupload.net) backend. A mobile device scans the QR code, uploads files to a ScanUpload session, and the desktop component receives real-time status updates over SignalR — rendering a live preview of every uploaded file.

This is a **monorepo** with a framework-agnostic core and dedicated adapter packages for React, Vue, Angular, Svelte, and Vanilla JS/TS.

## Packages

| Package | What it provides |
| --- | --- |
| [`@scanupload/qr-code-generator-core`](packages/core) | Framework-agnostic runtime — SignalR, session management, types |
| [`@scanupload/qr-code-generator-react`](packages/react) | React `<QrCodeGenerator>` component |
| [`@scanupload/qr-code-generator-vue`](packages/vue) | Vue 3 `<QrCodeGenerator>` component |
| [`@scanupload/qr-code-generator-angular`](packages/angular) | Angular `<sqg-qr-code-generator>` standalone component |
| [`@scanupload/qr-code-generator-svelte`](packages/svelte) | Svelte 5 `<QrCodeGenerator>` component |
| [`@scanupload/qr-code-generator-vanilla`](packages/vanilla) | `QrCodeGeneratorElement` — framework-free DOM renderer |

See each package's README for full details and a quick-start snippet.

## Quick start (React)

```bash
npm install @scanupload/qr-code-generator-react
```

```tsx
import { QrCodeGenerator } from "@scanupload/qr-code-generator-react";
import "@scanupload/qr-code-generator-react/dist/index.css";

export function UploadWidget() {
  return (
    <QrCodeGenerator
      sessionUrl="https://hub.scanupload.net/api/v2/front-end/session"
      clientId="your-tenant-id"
      header="Upload files from your phone"
      showHeader
      showDownloadButton
    />
  );
}
```

The browser `POST`s to `sessionUrl` directly. The ScanUpload hub authenticates the request from the browser's `Origin` header — no API token, no client-side proxy.

## Common props

All framework adapters share the same prop names. (Vue uses kebab-case in templates; Angular binds booleans with `[propName]`.) See each package's README for adapter-specific syntax.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `sessionUrl` | `string` | — (required) | Endpoint that creates a ScanUpload session. The browser POSTs here; the hub authenticates from `Origin`. |
| `clientId` | `string` | `undefined` | Optional tenant / Keycloak `client_id` sent in the request body as `{ "clientId": "..." }`. |
| `header` | `string` | `""` | Header text shown when `showHeader` is `true`. |
| `showHeader` | `boolean` | `false` | Render the header above the QR code. |
| `showLogo` | `boolean` | `true` | Overlay the ScanUpload logo in the centre of the QR code. |
| `clickQrCodeToReload` | `boolean` | `false` | When `true`, clicking the QR code reloads the session. When `false`, a Reload button is shown. |
| `filePreviewMode` | `"grid" \| "list"` | `"grid"` | Display uploaded files as tiles or a compact list. |
| `size` | `"small" \| "medium" \| "large" \| "xlarge"` | `"large"` | Overall size of the QR code container. |
| `showDownloadButton` | `boolean` | `false` | Show a "Download all files" button beneath the previews. When clicked, the component fetches every `UploadedFile.url` the SignalR hub has surfaced and triggers a browser save for each. |

## CSS custom properties

All packages share the same `--sqg-*` token names. Override them on `:root` to theme every widget at once.

```css
:root {
  --sqg-primary: #6366f1;
  --sqg-radius: 1rem;
}
```

| Token | Default | Affects |
| --- | --- | --- |
| `--sqg-primary` | `#1e3a5f` | Spinner ring, connected logo, retry / download button background |
| `--sqg-primary-hover` | `#1e40af` | Hover state for primary buttons |
| `--sqg-bg` | `#ffffff` | Widget background |
| `--sqg-text` | `#111827` | Main text colour |
| `--sqg-text-muted` | `#6b7280` | Hint text, file sizes |
| `--sqg-border` | `#d1d5db` | QR wrapper border, file card border |
| `--sqg-success` | `#22c55e` | Connected logo accent |
| `--sqg-error` | `#dc2626` | Error overlay text, disconnected logo, download error text |
| `--sqg-error-dark` | `#991b1b` | Disconnected logo gradient end |
| `--sqg-overlay-bg` | `rgba(255,255,255,0.9)` | Loading / error overlay background |
| `--sqg-retry-bg` | `#93c5fd` | Retry button background |
| `--sqg-retry-bg-hover` | `#3b82f6` | Retry button hover |
| `--sqg-reload-bg` | `#6b7280` | Reload button background |
| `--sqg-reload-bg-hover` | `var(--sqg-primary-hover)` | Reload button hover |
| `--sqg-spinner-color` | `var(--sqg-primary)` | Spinner ring colour |
| `--sqg-radius` | `0.5rem` | Border radius for buttons and cards |

## Demos

Runnable examples live in `examples/`. Each demo calls the hub directly using `VITE_SESSION_URL` (or `NEXT_PUBLIC_SESSION_URL`):

| Demo | Run |
| --- | --- |
| [React + Vite](examples/react-demo) | `npm run dev:react` |
| [Vue 3 + Vite](examples/vue-demo) | `npm run dev:vue` |
| [Angular + Vite](examples/angular-demo) | `npm run dev:angular` |
| [Svelte 5 + Vite](examples/svelte-demo) | `npm run dev:svelte` |
| [Vanilla JS + Vite](examples/vanilla-js) | `npm run dev:vanilla` |
| [Next.js App Router](examples/nextjs-demo) | `npm run dev:nextjs` |

All demos share the same layout pattern: a fixed-height card containing a settings panel and the widget. The widget's file list is the **only** element that scrolls; the page itself never scrolls, even with many uploaded files. See each demo's CSS for the `:has()`-based pattern that drives this.

## Architecture

See [README_FULL_ARCHITECTURE.md](README_FULL_ARCHITECTURE.md) for the full architecture overview.

### Layout & sizing

Every package emits the same DOM around the component for predictable styling:

| Element | Class | Notes |
| --- | --- | --- |
| Root | `.sqg-root` | `data-size="small\|medium\|large\|xlarge"` is set on the root, and `[data-size="..."]` rules in each package's CSS drive the QR container width/height (80, 120, 160, 192 px). The QR `<svg>` from `qrcode` always bakes `width="200"` so the inner SVG needs explicit `width: 100%; height: 100%` to scale. |
| Content | `.sqg-content` | A flex column. When the file container has actual file elements (`.sqg-file-card` or `.sqg-file-row`), `.sqg-content` grows to fill the widget via `:has()`. |
| File container (grid) | `.sqg-file-grid` | Direct child of `.sqg-content`. Flex row, wraps, scrolls vertically on overflow. |
| File container (list) | `.sqg-file-list` + `.sqg-file-list-inner` | The scrolling context is the **inner** element — putting `overflow: hidden` on the inner element while `overflow-y: auto` lives on the outer list causes the browser to measure scrollHeight as the outer height (clipped), so no scrollbar appears. The inner element must carry `overflow-y: auto` for the list to scroll. |

Across Angular, Svelte, and Vanilla, the demo CSS uses descendant combinators (`.mb-6:last-of-type .sqg-root`) rather than child combinators to survive framework-specific wrapper elements like Angular's `<sqg-qr-code-generator>` host element. Angular additionally needs `min-height: 0` on that host element so the flex chain can shrink the widget to fit the card. Vanilla additionally needs the intermediate `<div id="widget-container">` to be flexed into the chain so the widget doesn't size to its content and overflow the card.

## Development

```bash
npm install              # install all workspace dependencies
npm run build            # build all packages in dependency order
npm run dev:react        # run the React demo (rebuild packages first)
```

> The demos resolve packages from their local `dist/` folder. Always rebuild after changing any package source.

## License

MIT © Donald Asante
