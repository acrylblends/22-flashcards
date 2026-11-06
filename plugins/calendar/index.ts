/** The calendar at `/calendar`: upcoming reviews by date. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { dateLabel, type Flashcards } from '../flashcards/index.ts'
import type { Shell } from '../flashcards-shell/index.ts'
export const name = 'calendar'
export const inject = ['flashcards', 'shell', 'router']
export function apply(ctx: Context): void {
  const { flashcards, shell } = ctx
  const prefix = shell.prefix
  const app = new Acryl().get('/calendar', (c) => {
    const upcoming = flashcards.upcoming()
    const main = `<div class="topline"><div><div class="eyebrow">Schedule · next reviews</div><h1>Calendar</h1></div></div><div class="listpage" style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px 18px">${upcoming.map((row) => `<div class="deckrow"><span><b>${dateLabel(row.date)}</b><small>${String(row.count)} cards due</small></span><span class="tiny">${row.date}</span></div>`).join('')}</div>`
    return c.html(shell.page({ title: 'Calendar', active: 'calendar', main }))
  })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
