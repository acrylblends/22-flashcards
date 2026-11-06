import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp, readManifest } from '../src/app.ts'
import type { FlashcardsState } from '../plugins/flashcards/domain.ts'
import { pinnedInstance } from '../plugins/instance/index.ts'
import { noticeOf, NOW, projectRoot, withApp } from './support.ts'
const scratch = join(projectRoot, '.acrylblends', 'test')
mkdirSync(scratch, { recursive: true })

test('the first page is the mockup study session: stats, card, reveal, ratings and decks', () =>
  withApp(async (app) => {
    const page = await app.page('/')
    assert.equal(page.status, 200)
    assert.match(page.html, /Good afternoon, Alex\./)
    assert.match(page.html, /18 \/ 30 cards/)
    assert.match(page.html, /86%/)
    assert.match(page.html, /12 min/)
    assert.match(page.html, /JavaScript fundamentals/)
    assert.match(page.html, /Promise\.all\(\)/)
    assert.match(page.html, /Show answer/)
    assert.match(page.html, /Card <b>01<\/b> of 24/)
    for (const label of ['Again', 'Hard', 'Good', 'Easy']) assert.match(page.html, new RegExp(label))
    assert.match(page.html, /System design/)
    assert.match(page.html, /German B2 vocabulary/)
    assert.match(page.html, /Product thinking/)
    assert.match(page.html, /7 day streak/)
  }))

test('reveal shows the answer and grading records a review', () =>
  withApp(async (app) => {
    const card = app.root.flashcards.due(app.root.flashcards.decks()[0]!.id)[0]
    assert.ok(card !== undefined)
    const revealed = await app.page(`/?revealed=1`)
    assert.match(revealed.html, /It rejects immediately/)
    const response = await app.post(`/study/${card.id}/grade`, { rating: 'Good', deck: card.deckId })
    assert.equal(response.status, 303)
    assert.equal(noticeOf(response).kind, 'ok')
    assert.equal(app.root.flashcards.reviews(card.id).length >= 1, true)
  }))

test('decks list, create and take a card', () =>
  withApp(async (app) => {
    const page = await app.page('/decks')
    assert.match(page.html, /My decks/)
    assert.match(page.html, /24 due/)
    const created = await app.post('/decks', { name: 'New deck', description: 'A new study deck' })
    assert.equal(created.status, 303)
    const deck = app.root.flashcards.decks().find((item) => item.name === 'New deck')
    assert.ok(deck !== undefined)
    const card = await app.post(`/decks/${deck.id}/cards`, { prompt: 'Prompt', answer: 'Answer', hint: 'Hint' })
    assert.equal(noticeOf(card).kind, 'ok')
    assert.equal(app.root.flashcards.cards(deck.id).length, 1)
    const invalid = await app.post('/decks', { name: '', description: '' })
    assert.equal(noticeOf(invalid).kind, 'error')
  }))

test('the calendar and progress pages cover the review history', () =>
  withApp(async (app) => {
    const calendar = await app.page('/calendar')
    assert.match(calendar.html, /Calendar/)
    assert.match(calendar.html, /cards due/)
    const progress = await app.page('/progress')
    assert.match(progress.html, /Your progress/)
    assert.match(progress.html, /86%/)
    assert.match(progress.html, /Good/)
  }))

test('health, 404, prefix and the manifest work', async () => {
  await withApp(async (app) => {
    assert.equal((await app.page('/health')).status, 200)
    assert.equal((await app.page('/nope')).status, 404)
    assert.deepEqual(readManifest().plugins.map((row) => row.id), ['router', 'home', 'flashcards', 'flashcards-shell', 'study', 'decks', 'calendar', 'progress', 'extensions', 'server', 'acryl-door'])
  })
  await withApp(async (app) => {
    const response = await app.root.router.request('/app', { headers: { accept: 'text/html' } })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /href="\/app\/decks"/)
  }, { prefix: '/app' })
})

test('switching the decks out keeps the study session', async () => {
  const manifest = readManifest()
  const without = { ...manifest, plugins: manifest.plugins.map((row) => (row.id === 'decks' ? { ...row, disabled: true } : row)) }
  const home = await mkdtemp(join(scratch, 'app-test-off-'))
  let ids = 0
  const app = await createApp(pinnedInstance(home, { root: projectRoot }), { listen: false, manifest: without, overrides: { flashcards: { clock: () => NOW, newId: (kind: string) => `${kind}-${++ids}` } } })
  try {
    assert.equal((await app.root.router.request('/decks')).status, 404)
    assert.equal((await app.root.router.request('/', { headers: { accept: 'text/html' } })).status, 200)
  } finally { await app.stop(); await rm(home, { recursive: true, force: true }) }
})

test('a failed save reports the error instead of success', async () => {
  const broken = { load: async (): Promise<FlashcardsState | undefined> => undefined, save: async (): Promise<void> => { throw new Error('disk full') } }
  await withApp(async (app) => {
    const card = app.root.flashcards.due(app.root.flashcards.decks()[0]!.id)[0]
    assert.ok(card !== undefined)
    const response = await app.post(`/study/${card.id}/grade`, { rating: 'Good', deck: card.deckId })
    assert.equal(noticeOf(response).kind, 'error')
    assert.match(noticeOf(response).text, /could not be saved/)
  }, { overrides: { flashcards: { store: broken } } })
})
