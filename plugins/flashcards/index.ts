/** The study space as a plugin: decks, cards and reviews in the app's data home, provided as `ctx.flashcards`. */
import { randomUUID } from 'node:crypto'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { FlashcardsState } from './domain.ts'
import { Flashcards, type FlashcardsAdapters } from './flashcards.ts'
import { jsonFileStore, type Store } from './store.ts'
export * from './domain.ts'
export * from './flashcards.ts'
export * from './store.ts'
export { seed } from './seed.ts'
declare module '@deepseek-ai/cordis' { interface Context { flashcards: Flashcards } }
export interface FlashcardsConfig { readonly store?: Store<FlashcardsState>; readonly clock?: () => Date; readonly newId?: FlashcardsAdapters['newId']; readonly file?: string }
export const name = 'flashcards'
export const inject = ['appInstance']
export async function apply(ctx: Context, config: FlashcardsConfig = {}): Promise<void> {
  const file = config.file ?? 'flashcards.json'
  const flashcards = await Flashcards.open({ store: config.store ?? jsonFileStore<FlashcardsState>(isAbsolute(file) ? file : join(ctx.appInstance.home, file), 'Flashcards'), clock: config.clock ?? (() => new Date()), newId: config.newId ?? ((kind) => `${kind}-${randomUUID().slice(0, 8)}`) })
  ctx.provide('flashcards', flashcards)
}
