export interface PageInput { readonly title: string; readonly main: string; readonly active?: string; readonly scripts?: string }
export type Notice = { readonly kind: 'ok' | 'error' | 'warn'; readonly text: string }
export interface Shell { readonly prefix: string; e(text: string): string; href(path: string): string; page(input: PageInput): string; notice(url: string): string; back(value: unknown, fallback: string): string; url(path: string, notice?: Notice): string }
export const escapeHtml = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
export const CLIENT_SCRIPT = `<script>(function(){var t=document.getElementById('toast');window.recallToast=function(m){if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},1700)};document.addEventListener('keydown',function(e){if(e.key===' '&&document.getElementById('reveal')){e.preventDefault();document.getElementById('reveal').click()}var n={1:'Again',2:'Hard',3:'Good',4:'Easy'}[e.key];if(n){var b=document.querySelector('[data-rating="'+n+'"]');if(b)b.click()}});})();</script>`
export interface ShellLook { readonly appTitle: string; readonly css: string; readonly bodyClass: string; readonly nav: (active: string | undefined, href: (path: string) => string) => string }
export function createShell(prefix: string, look: ShellLook): Shell {
  const href = (path: string): string => `${prefix}${path.startsWith('/') ? path : `/${path}`}`
  return { prefix, e: escapeHtml, href,
    back(value, fallback) { return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : fallback },
    url(path, notice) { if (notice === undefined) return href(path); const [base, query] = path.split('?') as [string, string | undefined]; return `${href(base)}${query === undefined ? '?' : `?${query}&`}${notice.kind}=${encodeURIComponent(notice.text)}` },
    notice(url) { const query = new URL(url, 'http://local').searchParams; for (const kind of ['error', 'warn', 'ok'] as const) { const text = query.get(kind); if (text !== null && text !== '') return `<p class="notice ${kind}" role="${kind === 'ok' ? 'status' : 'alert'}">${escapeHtml(text)}</p>` } return '' },
    page({ title, main, active, scripts }) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · ${escapeHtml(look.appTitle)}</title><style>${look.css}</style></head><body class="${look.bodyClass}"><div class="layout">${look.nav(active, href)}<main class="main">${main}</main></div><div id="toast" class="toast" aria-live="polite"></div>${scripts ?? CLIENT_SCRIPT}</body></html>` },
  }
}
