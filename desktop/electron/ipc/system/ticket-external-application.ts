import { SURFACE_BASE_HEX } from '../../../src/shared/lib/surface-colors'

export const TICKET_EXTERNAL_APPLICATION_PARTITION = 'persist:tickets-external-application'

export function buildTicketExternalApplicationInjectScript(
  message: string,
  selector: string
): string {
  return `(function(){
    if (!document.body) return false;

    if (!document.getElementById('__pierre_close__')) {
      var btn = document.createElement('button');
      btn.id = '__pierre_close__';
      btn.textContent = '\\u2715  Fermer';
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
    }

    var target;
    try {
      target = document.querySelector(${JSON.stringify(selector)});
    } catch (_) {
      return false;
    }
    if (!target) return false;

    var message = ${JSON.stringify(message)};
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      var descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), 'value');
      if (descriptor && descriptor.set) descriptor.set.call(target, message);
      else target.value = message;
    } else {
      target.textContent = message;
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`
}

export function buildTicketExternalApplicationErrorHtml(url: string): string {
  const escaped = url.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Page inaccessible</title>
  <style>
    * { box-sizing: border-box; }
    body {
      display: flex;
      min-height: 100vh;
      margin: 0;
      align-items: center;
      justify-content: center;
      padding: 32px;
      background: ${SURFACE_BASE_HEX};
      color: #18181b;
      font-family: system-ui, sans-serif;
      text-align: center;
    }
    main { max-width: 420px; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    p { margin: 0; color: #71717a; font-size: 14px; line-height: 1.6; }
    code { display: block; margin-top: 12px; color: #71717a; font-size: 12px; word-break: break-all; }
    button {
      margin-top: 24px;
      border: 0;
      border-radius: 6px;
      padding: 8px 16px;
      background: #18181b;
      color: white;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main>
    <h1>Page inaccessible</h1>
    <p>Impossible de charger l’application externe.</p>
    <code>${escaped}</code>
    <button onclick="window.close()">Fermer</button>
  </main>
</body>
</html>`
}
