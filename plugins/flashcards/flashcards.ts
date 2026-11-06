/** The study service: decks, cards, the schedule, grading, deck and card creation and the stats. */
import { cleanName, cleanRating, cleanText, dateOf, dueCards, nextDelay, type Card, type Deck, FlashcardsError, type FlashcardsState, type Rating, type Review, statsOf, type StudyStats } from './domain.ts'
import { seed } from './seed.ts'
import type { Store } from './store.ts'
export interface FlashcardsAdapters { readonly store: Store<FlashcardsState>; readonly clock: () => Date; readonly newId: (kind: string) => string }
export class Flashcards {
  private state: FlashcardsState
  private readonly adapters: FlashcardsAdapters
  private constructor(state: FlashcardsState, adapters: FlashcardsAdapters) { this.state = state; this.adapters = adapters }
  static async open(adapters: FlashcardsAdapters): Promise<Flashcards> { const saved = await adapters.store.load(); return new Flashcards(saved ?? seed(adapters.clock(), adapters.newId), adapters) }
  get now(): Date { return this.adapters.clock() }
  decks(): readonly Deck[] { return this.state.decks }
  deck(id: string): Deck | undefined { return this.state.decks.find((deck) => deck.id === id) }
  cards(deckId: string): readonly Card[] { return this.state.cards.filter((card) => card.deckId === deckId) }
  due(deckId: string): Card[] { return dueCards(this.state.cards, deckId, this.now) }
  dueCount(deckId: string): number { return this.due(deckId).length }
  stats(): StudyStats { return statsOf(this.state, this.now) }
  reviews(cardId: string): readonly Review[] { return this.state.reviews.filter((review) => review.cardId === cardId).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)) }
  upcoming(): { date: string; count: number }[] {
    const counts = new Map<string, number>()
    for (const card of this.state.cards) { const date = dateOf(new Date(card.dueAt)); counts.set(date, (counts.get(date) ?? 0) + 1) }
    return [...counts.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
  }
  async grade(cardId: string, rating: unknown): Promise<{ card: Card; review: Review }> {
    const card = this.state.cards.find((item) => item.id === cardId)
    if (card === undefined) throw new FlashcardsError('not-found', 'That card no longer exists.')
    const clean = cleanRating(rating)
    const next = nextDelay(clean, card.intervalDays, card.ease)
    const reviewedAt = this.adapters.clock().toISOString()
    const updated: Card = { ...card, intervalDays: next.intervalDays, ease: next.ease, dueAt: new Date(this.adapters.clock().getTime() + next.minutes * 60_000).toISOString(), reviews: card.reviews + 1 }
    const review: Review = { id: this.adapters.newId('review'), cardId, rating: clean, reviewedAt, previousInterval: card.intervalDays, nextInterval: next.minutes }
    return this.commit(() => { this.state.cards = this.state.cards.map((item) => (item.id === cardId ? updated : item)); this.state.reviews.push(review); return { card: updated, review } })
  }
  async addDeck(name: unknown, description: unknown): Promise<Deck> {
    const deck: Deck = { id: this.adapters.newId('deck'), name: cleanName(name), description: typeof description === 'string' ? description.trim().slice(0, 300) : '' }
    return this.commit(() => { this.state.decks.push(deck); return deck })
  }
  async addCard(deckId: string, input: { prompt: unknown; answer: unknown; hint?: unknown }): Promise<Card> {
    if (this.deck(deckId) === undefined) throw new FlashcardsError('invalid', 'Choose a deck that exists.')
    const card: Card = { id: this.adapters.newId('card'), deckId, kind: 'CUSTOM', prompt: cleanText(input.prompt, 'Prompt'), answer: cleanText(input.answer, 'Answer'), hint: typeof input.hint === 'string' ? input.hint.trim().slice(0, 300) : '', intervalDays: 0, ease: 2.5, dueAt: this.adapters.clock().toISOString(), reviews: 0 }
    return this.commit(() => { this.state.cards.push(card); return card })
  }
  private async commit<T>(change: () => T): Promise<T> { const snapshot = structuredClone(this.state); const result = change(); try { await this.save() } catch (error) { this.state = snapshot; throw error } return result }
  private async save(): Promise<void> { this.state = { ...this.state, cards: [...this.state.cards], decks: [...this.state.decks], reviews: [...this.state.reviews] }; try { await this.adapters.store.save(this.state) } catch (error) { throw new FlashcardsError('storage', `The study space could not be saved: ${(error as Error).message}`) } }
}
