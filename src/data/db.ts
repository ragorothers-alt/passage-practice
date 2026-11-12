import Dexie, { type EntityTable } from 'dexie'
import type { Passage, Piece, Session, Source } from '@/domain/types'

export type AppDb = Dexie & {
  pieces: EntityTable<Piece, 'id'>
  sources: EntityTable<Source, 'id'>
  passages: EntityTable<Passage, 'id'>
  sessions: EntityTable<Session, 'id'>
}

export function createDb(name = 'passage-practice'): AppDb {
  const db = new Dexie(name) as AppDb
  db.version(1).stores({
    pieces: 'id, createdAt',
    sources: 'id, pieceId',
    passages: 'id, pieceId, due',
    sessions: 'id, passageId, pieceId, startedAt, dateKey',
  })
  return db
}

export const db = createDb()

/** 沒有安全連線（例如用區網 IP 開啟）時 crypto.randomUUID 不存在，所以自己產生 */
export function newId(): string {
  const time = Date.now().toString(36)
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(36).padStart(2, '0')).join('')
  return `${time}-${rand}`
}
