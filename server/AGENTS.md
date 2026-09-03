# Server development

## Bun-first runtime

This server runs on Bun. Prefer Bun-native and Web-standard APIs when they make the code
smaller or remove a dependency:

- IDs created by server code: `Bun.randomUUIDv7()`.
- Cryptographic hashes: `Bun.CryptoHasher`; passwords: `Bun.password`; encryption:
  Web Crypto (`crypto.subtle`). Do not import `node:crypto`.
- Binary encodings: `Uint8Array.fromBase64()`, `.toBase64()`, `.fromHex()`, and `.toHex()`
  instead of `Buffer`.
- Files and processes: `Bun.file`, `Bun.write`, `Bun.Glob`, `Bun.spawn`, and Bun Shell.
- Images supported by Bun: `Bun.Image`.
- Browser E2E tests: `Bun.WebView` with the Chrome backend. Use CDP only for capabilities
  absent from the high-level API, such as file inputs and `HttpOnly` cookies.

Keep a Node-compatible API when Bun has no equivalent that preserves behavior or makes the
code simpler. Current examples are `node:path`, filesystem streams required by `xlsx`, and
ImageMagick/Ghostscript for rasterizing and joining multi-page PDFs.

`Bun.WebView` requires Chrome, Chromium, Edge, or Brave. Set `BUN_CHROME_PATH` when Bun
cannot find the executable automatically.

## Verification

Run commands from the repository root. Use targeted tests while iterating, then run the
server typecheck, unit tests, formatting check, lint check, and browser E2E suite for changes
that affect browser flows.
