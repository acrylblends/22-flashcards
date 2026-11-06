/** Progress at `/progress`: the daily goal, accuracy, time and recent reviews. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Flashcards } from '../flashcards/index.ts'
import type { Shell } from '../flashcards-shell/index.ts'
export const name = 'progress'
export const inject = ['flashcards', 'shell', 'router']
export function apply(ctx: Context): void {
  const { flashcards, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const app = new Acryl().get('/progress', (c) => {
    const stats = flashcards.stats()
    const reviews = flashcards.decks().flatMap((deck) => flashcards.cards(deck.id).flatMap((card) => flashcards.reviews(card.id).map((review) => ({ review, card, deck })))).sort((a, b) => b.review.reviewedAt.localeCompare(a.review.reviewedAt)).slice(0, 20)
    const rows = reviews.map(({ review, card, deck }) => `<tr><td>${e(review.reviewedAt.slice(0, 16).replace('T', ' '))}</td><td>${e(deck.name)}</td><td>${e(card.prompt.slice(0, 60))}</td><td><span class="tag">${e(review.rating)}</span></td></tr>`).join('')
    const main = `<div class="topline"><div><div class="eyebrow">Progress · recall over time</div><h1>Your progress</h1></div></div><div class="progressrow"><div class="stat"><small>Today's goal</small><strong>${String(stats.doneToday)} / ${String(stats.goal)}</strong><div class="bar"><i style="width:${String(Math.min(100, Math.round((stats.doneToday / Math.max(1, stats.goal)) * 100)))}%"></i></div></div><div class="stat"><small>Accuracy</small><strong>${String(stats.accuracy)}%</strong></div><div class="stat"><small>Streak</small><strong>${String(stats.streak)} days</strong></div></div><div class="listpage" style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 18px"><table class="table"><thead><tr><th>WHEN</th><th>DECK</th><th>CARD</th><th>RATING</th></tr></thead><tbody>${rows}</tbody></table></div>`
    return c.html(shell.page({ title: 'Progress', active: 'progress', main }))
  })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
