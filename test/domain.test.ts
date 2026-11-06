import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueCards, Flashcards, FlashcardsError, nextDelay, statsOf, type FlashcardsState } from '../plugins/flashcards/index.ts'
import { seed, SEED_FACTS } from '../plugins/flashcards/seed.ts'
import { memoryStore } from '../plugins/flashcards/store.ts'
import { NOW } from './support.ts'
const ids = (): ((kind: string) => string) => { let next = 0; return (kind) => `${kind}-${String(++next)}` }
const open = (): Promise<Flashcards> => Flashcards.open({ store: memoryStore<FlashcardsState>(), clock: () => NOW, newId: ids() })

test('the seed is the study space: four decks, 49 due cards, 18 reviews today and the first Promise card', () => {
  const state = seed(NOW, ids())
  assert.equal(state.decks.length, SEED_FACTS.decks)
  assert.equal(state.cards.length, SEED_FACTS.cards)
  assert.equal(state.reviews.length, SEED_FACTS.reviews)
  assert.equal(statsOf(state, NOW).doneToday, 18)
  assert.equal(dueCards(state.cards, state.decks[0]!.id, NOW).length, 24)
  assert.equal(state.cards[0]?.prompt.includes('Promise.all()'), true)
  const stats = statsOf(state, NOW)
  assert.equal(stats.doneToday, 18)
  assert.equal(stats.goal, 30)
  assert.equal(stats.accuracy, 86)
  assert.equal(stats.dueToday, 49)
})

test('the scheduler returns sooner for Again and further out for Easy', () => {
  assert.equal(nextDelay('Again', 10, 2.5).minutes, 1)
  assert.equal(nextDelay('Hard', 10, 2.5).minutes, 6)
  assert.ok(nextDelay('Good', 0, 2.5).minutes >= 10)
  assert.ok(nextDelay('Easy', 10, 2.5).minutes > nextDelay('Good', 10, 2.5).minutes)
})

test('grading persists the schedule and a review', async () => {
  const store = memoryStore<FlashcardsState>()
  const flashcards = await Flashcards.open({ store, clock: () => NOW, newId: ids() })
  const card = flashcards.due(flashcards.decks()[0]!.id).find((item) => item.reviews === 0)
  assert.ok(card !== undefined)
  const result = await flashcards.grade(card.id, 'Good')
  assert.equal(result.review.rating, 'Good')
  assert.equal(result.card.reviews, 1)
  assert.equal(flashcards.reviews(card.id).length >= 1, true)
  assert.equal(store.saved, 1)
  await assert.rejects(flashcards.grade(card.id, 'Perfect'), /Again, Hard, Good or Easy/)
})

test('decks and cards validate and persist', async () => {
  const flashcards = await open()
  const deck = await flashcards.addDeck('New deck', 'A description')
  assert.equal(flashcards.decks().length, 5)
  await assert.rejects(flashcards.addDeck('', 'x'), (error: unknown) => error instanceof FlashcardsError && error.code === 'invalid')
  const card = await flashcards.addCard(deck.id, { prompt: 'Prompt', answer: 'Answer', hint: 'Hint' })
  assert.equal(flashcards.cards(deck.id).length, 1)
  await assert.rejects(flashcards.addCard(deck.id, { prompt: '', answer: 'x' }), /Prompt/)
  assert.equal(card.reviews, 0)
})

test('a failed save is a storage error', async () => {
  const broken = await Flashcards.open({ store: { load: async () => undefined, save: async () => { throw new Error('disk full') } }, clock: () => NOW, newId: ids() })
  const card = broken.cards(broken.decks()[0]!.id)[0]
  assert.ok(card !== undefined)
  await assert.rejects(broken.grade(card.id, 'Good'), (error: unknown) => error instanceof FlashcardsError && error.code === 'storage')
})
