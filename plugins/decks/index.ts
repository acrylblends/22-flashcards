/** Decks: the list at `/decks`, the create form and one deck's cards with the add-card form. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { FlashcardsError, type Flashcards } from '../flashcards/index.ts'
import type { Shell } from '../flashcards-shell/index.ts'

export const name = 'decks'
export const inject = ['flashcards', 'shell', 'router']

export function apply(ctx: Context): void {
  const { flashcards, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const rows = () => flashcards.decks().map((deck) => `<a class="deckrow" href="${shell.href(`/decks/${encodeURIComponent(deck.id)}`)}"><span><b>${e(deck.name)}</b><small>${e(deck.description)}</small></span><span class="tiny">${String(flashcards.dueCount(deck.id))} due</span></a>`).join('')
  const app = new Acryl()
    .get('/decks', (c) => c.html(shell.page({ title: 'My decks', active: 'decks', main: `${shell.notice(c.req.url)}<div class="topline"><div><div class="eyebrow">Library · ${String(flashcards.decks().length)} decks</div><h1>My decks</h1></div><a class="reveal" href="${shell.href('/decks/new')}">＋ Create a deck</a></div><div class="listpage" style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px 18px">${rows()}</div>` })))
    .get('/decks/new', (c) => c.html(shell.page({ title: 'Create a deck', active: 'new', main: `${shell.notice(c.req.url)}<div class="topline"><div><div class="eyebrow">Library · New deck</div><h1>Create a deck</h1></div></div><form class="form" method="post" action="${shell.href('/decks')}"><h2>Deck details</h2><label class="field"><span>NAME</span><input name="name" placeholder="German B2 vocabulary" required></label><label class="field"><span>DESCRIPTION</span><textarea name="description" placeholder="What is this deck for?"></textarea></label><div class="actions"><button class="primary" type="submit">Create deck</button><a href="${shell.href('/decks')}">Cancel</a></div></form>` })))
    .post('/decks', async (c) => {
      const body = await c.req.parseBody()
      try { const deck = await flashcards.addDeck(body.name, body.description); return c.redirect(shell.url(`/decks/${encodeURIComponent(deck.id)}`, { kind: 'ok', text: `${deck.name} was created.` }), 303) } catch (error) { if (!(error instanceof FlashcardsError)) throw error; return c.redirect(shell.url('/decks/new', { kind: 'error', text: error.message }), 303) }
    })
    .get('/decks/:id', (c) => {
      const deck = flashcards.deck(c.req.param('id'))
      if (deck === undefined) return c.redirect(shell.url('/decks', { kind: 'error', text: 'That deck no longer exists.' }), 303)
      const cards = flashcards.cards(deck.id).map((card) => `<div class="deckrow"><span><b>${e(card.prompt)}</b><small>${e(card.answer)}</small></span><span class="tiny">${String(card.reviews)} reviews</span></div>`).join('')
      const main = `${shell.notice(c.req.url)}<div class="topline"><div><div class="eyebrow">Library · ${String(flashcards.cards(deck.id).length)} cards</div><h1>${e(deck.name)}</h1></div><a class="reveal" href="${shell.href('/')}?deck=${encodeURIComponent(deck.id)}">Study this deck</a></div><div class="listpage" style="background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px 18px">${cards === '' ? '<p class="empty">No cards yet.</p>' : cards}</div><form class="form" method="post" action="${shell.href(`/decks/${encodeURIComponent(deck.id)}/cards`)}"><h2>Add a card</h2><label class="field"><span>PROMPT</span><textarea name="prompt" required placeholder="The question or cue"></textarea></label><label class="field"><span>ANSWER</span><textarea name="answer" required placeholder="The answer"></textarea></label><label class="field"><span>HINT</span><input name="hint" placeholder="A small nudge"></label><div class="actions"><button class="primary" type="submit">Add card</button></div></form>`
      return c.html(shell.page({ title: deck.name, active: 'decks', main }))
    })
    .post('/decks/:id/cards', async (c) => {
      const body = await c.req.parseBody()
      try { await flashcards.addCard(c.req.param('id'), { prompt: body.prompt, answer: body.answer, hint: body.hint }); return c.redirect(shell.url(`/decks/${encodeURIComponent(c.req.param('id'))}`, { kind: 'ok', text: 'Card added.' }), 303) } catch (error) { if (!(error instanceof FlashcardsError)) throw error; return c.redirect(shell.url(`/decks/${encodeURIComponent(c.req.param('id'))}`, { kind: 'error', text: error.message }), 303) }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
}
