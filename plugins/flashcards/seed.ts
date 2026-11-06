/** The study space: four decks with 49 cards due, 18 reviews already logged today, and the mockup's first card. */
import type { Card, Deck, FlashcardsState, Rating, Review } from './domain.ts'
export function seed(now: Date, newId: (kind: string) => string): FlashcardsState {
  const decks: Deck[] = [
    { id: newId('deck'), name: 'JavaScript fundamentals', description: 'Closures, promises, the event loop and the parts of the language that come up in interviews.' },
    { id: newId('deck'), name: 'System design', description: 'Caching, queues, consistency and the trade-offs behind a service boundary.' },
    { id: newId('deck'), name: 'German B2 vocabulary', description: 'The words that keep appearing in news and at work.' },
    { id: newId('deck'), name: 'Product thinking', description: 'Discovery, positioning and the questions before the roadmap.' },
  ]
  const firstCards: readonly { kind: string; prompt: string; answer: string; hint: string }[] = [
    { kind: 'ASYNC JAVASCRIPT', prompt: 'What does Promise.all() return when one promise rejects?', answer: 'It rejects immediately with the first rejection reason. It does not wait for all promises to settle. Use Promise.allSettled() when you need every outcome.', hint: 'Think of the behavior when one task fails.' },
    { kind: 'SCOPE', prompt: 'What is a closure?', answer: 'A function together with the lexical environment it captured; it can read variables from the scope where it was created even after that scope returned.', hint: 'A function carrying its birthplace.' },
    { kind: 'EVENT LOOP', prompt: 'What runs first, a promise callback or a setTimeout with 0 ms?', answer: 'The promise callback: microtasks run before the next macrotask.', hint: 'Micro before macro.' },
    { kind: 'TYPES', prompt: 'What is the difference between == and ===?', answer: '== compares after coercion; === compares value and type without coercion.', hint: 'One converts, one does not.' },
  ]
  const cardKinds = ['JavaScript fundamentals', 'System design', 'German B2 vocabulary', 'Product thinking']
  const dueCounts = [24, 12, 8, 5]
  const cards: Card[] = []
  decks.forEach((deck, deckIndex) => {
    const count = dueCounts[deckIndex] as number
    for (let index = 0; index < count; index += 1) {
      const base = deckIndex === 0 && firstCards[index] !== undefined ? firstCards[index] as typeof firstCards[number] : { kind: cardKinds[deckIndex] as string, prompt: `${deck.name} card ${String(index + 1)}: recall the key idea.`, answer: `The seeded answer for ${deck.name} card ${String(index + 1)}. Replace it with your own card.`, hint: 'A seeded card for the demo.' }
      cards.push({ id: newId('card'), deckId: deck.id, kind: base.kind, prompt: base.prompt, answer: base.answer, hint: base.hint, intervalDays: 0, ease: 2.5, dueAt: new Date(now.getTime() - 3_600_000).toISOString(), reviews: index === 0 ? 3 : 0 })
    }
  })
  const ratings: Rating[] = ['Good', 'Good', 'Easy', 'Again', 'Hard', 'Good', 'Good', 'Good', 'Easy', 'Good', 'Again', 'Good', 'Good', 'Easy', 'Good', 'Hard', 'Good', 'Good']
  const reviews: Review[] = ratings.map((rating, index) => ({ id: newId('review'), cardId: (cards[index % 24] as Card).id, rating, reviewedAt: new Date(now.getTime() - (index + 1) * 60_000).toISOString(), previousInterval: 0, nextInterval: rating === 'Again' ? 1 : rating === 'Hard' ? 6 : rating === 'Good' ? 1440 : 5760 }))
  for (let index = 0; index < 32; index += 1) {
    reviews.push({ id: newId('review'), cardId: (cards[index % cards.length] as Card).id, rating: index < 29 ? 'Good' : 'Again', reviewedAt: new Date(now.getTime() - (24 + index) * 3_600_000).toISOString(), previousInterval: 1, nextInterval: 1440 })
  }
  return { version: 1, decks, cards, reviews, goal: 30 }
}
export const SEED_FACTS = { decks: 4, cards: 49, due: 49, reviews: 50, goal: 30 } as const
