# Server development

API de référence : <https://bun.com/docs>. Les prendre avant toute API Node familière.

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

Run commands from the repository root. Use targeted tests while iterating, then run `bun check`, `bun test --cwd server --max-concurrency 1 unit`, `bun fmt --check`,
`bun oxlint`,
and `bun server:e2e` for browser flows. `bun test` does not start the server or seed the datastore; `server/tests/e2e/run.ts` does, then runs `bun test tests/e2e`.
