/** The study session at `/`: the due card, reveal, the four ratings, and the per-deck due counts. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { intervalText, nextDelay, RATINGS, type Card, type Flashcards, type Rating } from '../flashcards/index.ts'
import type { Shell } from '../flashcards-shell/index.ts'

export const name = 'study'
export const inject = ['flashcards', 'shell', 'router']

function rich(text: string): string { return escapeHtml(text).replaceAll('Promise.allSettled()', '<code>Promise.allSettled()</code>').replaceAll('Promise.all()', '<code>Promise.all()</code>') }

function escapeHtml(text: string): string { return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;') }

export function apply(ctx: Context): void {
  const { flashcards, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const app = new Acryl()
    .get('/', (c) => {
      const deckId = c.req.query('deck')
      const deck = deckId === undefined ? flashcards.decks()[0] : flashcards.deck(deckId)
      const due = deck === undefined ? [] : flashcards.due(deck.id)
      const index = Math.min(Math.max(0, Number.parseInt(c.req.query('card') ?? '0', 10) || 0), Math.max(0, due.length - 1))
      const card: Card | undefined = due[index]
      const revealed = c.req.query('revealed') === '1' && card !== undefined
      const stats = flashcards.stats()
      const decks = flashcards.decks().map((item) => `<a class="deckitem${item.id === deck?.id ? ' active' : ''}" href="${shell.href('/')}?deck=${encodeURIComponent(item.id)}"><div><b>${e(item.name)}</b><br><small>${String(flashcards.dueCount(item.id))} cards due</small></div><b>${String(flashcards.dueCount(item.id))}</b></a>`).join('')
      const ratings = card === undefined ? '' : `<div class="ratings${revealed ? ' show' : ''}">${RATINGS.map((rating: Rating) => { const next = nextDelay(rating, card.intervalDays, card.ease); return `<form method="post" action="${shell.href(`/study/${encodeURIComponent(card.id)}/grade`)}"><input type="hidden" name="rating" value="${rating}"><input type="hidden" name="deck" value="${e(deck?.id ?? '')}"><button class="rating" data-rating="${rating}" type="submit">${rating}<span>${intervalText(next.minutes)}</span></button></form>` }).join('')}</div>`
      const flash = card === undefined
        ? `<div class="flashcard"><div class="cardinner"><div class="cardkind">ALL CAUGHT UP</div><div class="question">No cards due in this deck.</div><div class="hint">Pick another deck or add a card.</div></div></div>`
        : `<div class="flashcard${revealed ? ' flip' : ''}"><div class="cardinner"><div class="cardkind">${e(card.kind)}</div><div class="question">${rich(card.prompt)}</div><div class="answer">${rich(card.answer)}</div><div class="hint">${e(revealed ? card.hint : 'Think of the answer, then reveal it.')}</div></div></div>${revealed ? '' : `<a class="reveal" id="reveal" href="${shell.href(`/?deck=${encodeURIComponent(deck?.id ?? '')}&card=${String(index)}&revealed=1`)}">Show answer ↗</a>`}`
      const main = `${shell.notice(c.req.url)}<div class="topline"><div><div class="eyebrow">Tuesday · Daily review</div><h1>Good afternoon, Alex.</h1></div><div class="profile"><div class="avatar">AM</div>Alex M. ⌄</div></div><div class="progressrow"><div class="stat"><small>Today's learning goal</small><strong>${String(stats.doneToday)} / ${String(stats.goal)} cards</strong><div class="bar"><i style="width:${String(Math.min(100, Math.round((stats.doneToday / Math.max(1, stats.goal)) * 100)))}%"></i></div></div><div class="stat"><small>Current accuracy</small><strong>${String(stats.accuracy)}%</strong><small style="color:#2e8a67">Seeded review history</small></div><div class="stat"><small>Time invested</small><strong>${String(stats.minutes)} min</strong><small>${String(stats.dueToday)} cards still due</small></div></div><section class="study"><div class="session"><div class="sessionhead"><span>DECK · <b>${e(deck?.name ?? 'No deck')}</b></span><span>Card <b>${String(card === undefined ? 0 : index + 1).padStart(2, '0')}</b> of ${String(due.length).padStart(2, '0')}</span></div>${flash}${ratings}</div><aside class="deckside"><div><h3>Continue a deck</h3>${decks}</div><div class="sidebox"><div class="eyebrow">UP NEXT</div><h3 style="margin:7px 0">Spaced repetition</h3><p>Cards are scheduled using your recall rating. Difficult cards return sooner; easy cards move further out.</p></div></aside></section>`
      return c.html(shell.page({ title: 'Study session', active: 'study', main }))
    })
    .post('/study/:id/grade', async (c) => {
      const body = await c.req.parseBody()
      try {
        await flashcards.grade(c.req.param('id'), body.rating)
        return c.redirect(shell.url(`/?deck=${encodeURIComponent(String(body.deck ?? ''))}`, { kind: 'ok', text: `Rated ${String(body.rating)}. Next review scheduled.` }), 303)
      } catch (error) {
        return c.redirect(shell.url('/', { kind: 'error', text: (error as Error).message }), 303)
      }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
