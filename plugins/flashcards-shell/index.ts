/** The recall shell: the navy study navigation, the streak card and the page column. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Flashcards } from '../flashcards/index.ts'
import { createShell, type Shell } from './core.ts'
import { STYLES } from './styles.ts'
export * from './core.ts'
export const APP_TITLE = 'Flashcards'
export interface ShellConfig { readonly prefix?: string }
export const name = 'flashcards-shell'
export const inject = ['flashcards', 'router']
declare module '@deepseek-ai/cordis' { interface Context { shell: Shell } }
function nav(active: string | undefined, href: (path: string) => string): string {
  const item = (id: string, label: string, path: string): string => `<a class="navitem${id === active ? ' active' : ''}" href="${href(path)}">${label}</a>`
  return `<aside class="nav"><a class="logo" href="${href('/')}"><i>R</i> recall</a><div class="navlabel">YOUR SPACE</div>${item('study', '▣ &nbsp; Study session', '/')}${item('decks', '▤ &nbsp; My decks', '/decks')}${item('calendar', '◷ &nbsp; Calendar', '/calendar')}${item('progress', '⌁ &nbsp; Progress', '/progress')}<div class="navlabel">LIBRARY</div>${item('new', '＋ &nbsp; Create a deck', '/decks/new')}<a class="navitem" href="${href('/decks')}">⌕ &nbsp; Discover</a><div class="spacer"></div><div class="streak"><b>↗ 7 day streak</b><small>Keep the momentum. 12 cards left today.</small></div></aside>`
}
export function apply(ctx: Context, config: ShellConfig = {}): void {
  const flashcards: Flashcards = ctx.flashcards
  const prefix = config.prefix ?? ''
  const shell = createShell(prefix, { appTitle: APP_TITLE, css: STYLES, bodyClass: 'recall', nav })
  ctx.provide('shell', shell)
  ctx.router.route(prefix === '' ? '/' : prefix, new Acryl().get('/health', (c) => c.json({ ok: true })))
  void flashcards
}
