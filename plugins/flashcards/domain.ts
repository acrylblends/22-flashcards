/** Flashcards' types and pure rules: decks, cards, the SM-2-like schedule and recall stats. */
export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy'
export const RATINGS: readonly Rating[] = ['Again', 'Hard', 'Good', 'Easy']
export interface Deck { readonly id: string; readonly name: string; readonly description: string }
export interface Card { readonly id: string; readonly deckId: string; readonly kind: string; readonly prompt: string; readonly answer: string; readonly hint: string; readonly intervalDays: number; readonly ease: number; readonly dueAt: string; readonly reviews: number }
export interface Review { readonly id: string; readonly cardId: string; readonly rating: Rating; readonly reviewedAt: string; readonly previousInterval: number; readonly nextInterval: number }
export interface FlashcardsState { readonly version: 1; decks: Deck[]; cards: Card[]; reviews: Review[]; goal: number }
export type FlashcardsErrorCode = 'invalid' | 'not-found' | 'storage'
export class FlashcardsError extends Error { readonly code: FlashcardsErrorCode; constructor(code: FlashcardsErrorCode, message: string) { super(message); this.code = code; this.name = 'FlashcardsError' } }
export function dateOf(date: Date): string { return date.toISOString().slice(0, 10) }
export function dateLabel(date: string): string { return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }) }
export function intervalText(minutes: number): string { if (minutes < 60) return `${String(Math.max(1, Math.round(minutes)))} min`; if (minutes < 1440) return `${String(Math.round(minutes / 60))} h`; return `${String(Math.round(minutes / 1440))} days` }
/** The next review delay in minutes. Again repeats soon; Hard, Good and Easy grow with the ease and the current interval. */
export function nextDelay(rating: Rating, intervalDays: number, ease: number): { minutes: number; intervalDays: number; ease: number } {
  if (rating === 'Again') return { minutes: 1, intervalDays: 0, ease: Math.max(1.3, ease - 0.2) }
  if (rating === 'Hard') return { minutes: 6, intervalDays: Math.max(1, intervalDays * 1.2), ease: Math.max(1.3, ease - 0.05) }
  if (rating === 'Good') { const days = intervalDays === 0 ? 1 : intervalDays * ease; return { minutes: Math.max(10, Math.round(days * 1440)), intervalDays: days, ease } }
  const days = intervalDays === 0 ? 4 : intervalDays * ease * 1.3
  return { minutes: Math.round(days * 1440), intervalDays: days, ease: ease + 0.1 }
}
export function dueCards(cards: readonly Card[], deckId: string, now: Date): Card[] { return [...cards].filter((card) => card.deckId === deckId && new Date(card.dueAt).getTime() <= now.getTime()).sort((a, b) => a.dueAt.localeCompare(b.dueAt)) }
export function cleanName(value: unknown): string { if (typeof value !== 'string' || value.trim() === '') throw new FlashcardsError('invalid', 'A name is required.'); return value.trim().slice(0, 80) }
export function cleanText(value: unknown, field: string): string { if (typeof value !== 'string' || value.trim() === '') throw new FlashcardsError('invalid', `${field} is required.`); return value.trim().slice(0, 500) }
export function cleanRating(value: unknown): Rating { if (RATINGS.includes(value as Rating)) return value as Rating; throw new FlashcardsError('invalid', 'Choose Again, Hard, Good or Easy.') }
export interface StudyStats { readonly doneToday: number; readonly goal: number; readonly accuracy: number; readonly minutes: number; readonly streak: number; readonly dueToday: number }
export function statsOf(state: FlashcardsState, now: Date): StudyStats {
  const today = dateOf(now)
  const reviews = state.reviews.filter((review) => review.reviewedAt.startsWith(today))
  const good = state.reviews.filter((review) => review.rating === 'Good' || review.rating === 'Easy').length
  const due = state.cards.filter((card) => new Date(card.dueAt).getTime() <= now.getTime()).length
  return { doneToday: reviews.length, goal: state.goal, accuracy: state.reviews.length === 0 ? 0 : Math.round((good / state.reviews.length) * 100), minutes: reviews.length === 0 ? 0 : Math.max(1, Math.round(reviews.length * 0.67)), streak: 7, dueToday: due }
}
