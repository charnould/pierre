/**
 * Pure helpers for the automation report modal (openAutomationReport IPC).
 * Kept separate so they can be unit-tested without Electron.
 */

import { parseHTML } from 'linkedom'
import sanitizeHtml from 'sanitize-html'

const REPORT_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'svg',
    'g',
    'path',
    'circle',
    'rect',
    'line',
    'polyline',
    'polygon',
    'ellipse',
    'text',
    'tspan',
    'defs',
    'clipPath',
    'linearGradient',
    'radialGradient',
    'stop',
    'use',
    'symbol',
    'title',
    'desc',
    'filter',
    'marker',
    'pattern',
    'mask'
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'align', 'role', 'aria-*', 'data-*'],
    a: ['href', 'name', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false
}

/** Strip executable / remote chrome from LLM HTML before inject. */
export function sanitizeReportHtml(html: string): string {
  return sanitizeHtml(html, REPORT_SANITIZE)
}

/**
 * Prefer `<article class="report">` when a full document was stored;
 * otherwise return the sanitized fragment as-is.
 */
export function extractReportArticle(html: string): string {
  const sanitized = sanitizeReportHtml(html.trim())
  const { document } = parseHTML(`<!doctype html><body>${sanitized}</body>`)
  const article = document.querySelector('article.report')
  return article?.outerHTML ?? sanitized
}

/**
 * Injects sanitized report HTML into `#report-root`, adds a close button,
 * then mounts ECharts. Returns a JS expression evaluating to `true`/`false`.
 */
export function buildReportInjectScript(html: string): string {
  const article = extractReportArticle(html)
  return `(function(){
    if (!document.body) return false;

    var btn = document.createElement('button');
    btn.id = '__report_close__';
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

    var root = document.getElementById('report-root');
    if (!root) return false;
    root.innerHTML = ${JSON.stringify(article)};
    if (typeof window.__reportMountCharts === 'function') {
      window.__reportMountCharts();
    }
    return true;
  })()`
}
