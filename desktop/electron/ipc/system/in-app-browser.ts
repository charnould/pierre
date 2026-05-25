/**
 * Pure helpers for the in-app browser modal (openInAppBrowser IPC handler).
 * Kept separate so they can be unit-tested without Electron.
 */

import { SURFACE_BASE_HEX } from '../../../src/shared/lib/surface-colors'

/**
 * Builds the JavaScript string injected into the target page after load.
 *
 * It:
 *  1. Appends a floating close button that calls `window.close()`.
 *  2. Injects `answer` into `#pierre-bridge-demo-answer` (if present).
 *
 * Returns a JS expression whose value is `true` when the target div was found,
 * `false` otherwise (so the caller can detect the "div not found" case).
 */
export function buildBridgeScript(answer: string): string {
  return `(function(){
    if (!document.body) return false;

    /* ── Close button ─────────────────────────────────────────── */
    var btn = document.createElement('button');
    btn.id = '__pierre_close__';
    btn.textContent = '\u2715  Fermer';
    btn.onclick = function(){ window.close(); };
    Object.assign(btn.style, {
      position: 'fixed',
      top: '14px',
      right: '18px',
      zIndex: '2147483647',
      padding: '6px 14px',
      background: '#18181b',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      lineHeight: '1.4'
    });
    document.body.appendChild(btn);

    /* ── Inject answer ────────────────────────────────────────── */
    var el = document.getElementById('pierre-bridge-demo-answer');
    if (!el) return false;
    el.textContent = ${JSON.stringify(answer)};

    return true;
  })()`
}

/**
 * Builds the HTML string displayed inside the modal when the URL fails to load.
 */
export function buildErrorHtml(url: string): string {
  const escaped = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Page inaccessible</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      background: ${SURFACE_BASE_HEX};
      color: #18181b;
      padding: 32px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
    p  { font-size: 14px; color: #71717a; max-width: 420px; line-height: 1.6; }
    code {
      display: block;
      margin-top: 12px;
      font-size: 12px;
      color: #a1a1aa;
      word-break: break-all;
    }
    button {
      margin-top: 28px;
      padding: 8px 20px;
      background: #18181b;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="icon">⚠️</div>
  <h1>Page inaccessible</h1>
  <p>Impossible de charger la page. Vérifiez que le serveur est démarré et accessible depuis cette machine.</p>
  <code>${escaped}</code>
  <button onclick="window.close()">Fermer</button>
</body>
</html>`
}
