import type { GroupSize, TempoMode } from '@/domain/rhythm'
import { type ColdTest, type Rating, nextSchedule, toDateKey } from '@/domain/schedule'
import type { Instrument, Passage, PassageOrigin, Piece, Session, Source } from '@/domain/types'
import { type AppDb, db as defaultDb, newId } from './db'

export interface NewPiece {
  title: string
  composer: string
  instrument: Instrument
}

export interface NewSource {
  name: string
  blob: Blob
  kind: 'pdf' | 'image'
  pageCount: number
}

export interface NewPassage {
  pieceId: string
  title: string
  focus: string
  crops: Blob[]
  origin: PassageOrigin | null
  groupSize: GroupSize
  targetBpm: number
  currentBpm: number
}

export interface SessionResult {
  startedAt: number
  durationSec: number
  patternId: string
  groupSize: GroupSize
  tempoMode: TempoMode
  bpmStart: number
  bpmEnd: number
  rating: Rating
  coldTest: ColdTest | null
  note: string
}

export function createRepo(db: AppDb = defaultDb) {
  return {
    async createPiece(input: NewPiece): Promise<Piece> {
      const piece: Piece = { id: newId(), createdAt: Date.now(), ...input }
      await db.pieces.add(piece)
      return piece
    },

    async updatePiece(id: string, patch: Partial<NewPiece>): Promise<void> {
      await db.pieces.update(id, patch)
    },

    /** 連同這首曲子的樂譜、樂段與練習紀錄一起刪除 */
    async deletePiece(id: string): Promise<void> {
      await db.transaction('rw', db.pieces, db.sources, db.passages, db.sessions, async () => {
        await db.sessions.where('pieceId').equals(id).delete()
        await db.passages.where('pieceId').equals(id).delete()
        await db.sources.where('pieceId').equals(id).delete()
        await db.pieces.delete(id)
      })
    },

    async addSource(pieceId: string, file: NewSource): Promise<Source> {
      const source: Source = { id: newId(), pieceId, lastPage: 1, createdAt: Date.now(), ...file }
      await db.sources.add(source)
      return source
    },

    async setSourcePage(id: string, page: number): Promise<void> {
      await db.sources.update(id, { lastPage: page })
    },

    /** 已框選的樂段保留自己的圖片，只是不能再回到原檔重新框選 */
    async deleteSource(id: string): Promise<void> {
      await db.transaction('rw', db.sources, db.passages, async () => {
        await db.passages.filter(p => p.origin?.sourceId === id).modify({ origin: null })
        await db.sources.delete(id)
      })
    },

    async createPassage(input: NewPassage, today = toDateKey(new Date())): Promise<Passage> {
      const passage: Passage = {
        id: newId(),
        patternId: 'even',
        tempoMode: 'keepPulse',
        due: today,
        intervalDays: 0,
        lastPracticedAt: null,
        lastNote: '',
        createdAt: Date.now(),
        ...input,
      }
      await db.passages.add(passage)
      return passage
    },

    async updatePassage(id: string, patch: Partial<Passage>): Promise<void> {
      await db.passages.update(id, patch)
    },

    async deletePassage(id: string): Promise<void> {
      await db.transaction('rw', db.passages, db.sessions, async () => {
        await db.sessions.where('passageId').equals(id).delete()
        await db.passages.delete(id)
      })
    },

    /** 存下一次練習，並依結果排定下次複習日 */
    async recordSession(passageId: string, result: SessionResult, now = new Date()): Promise<Session> {
      return db.transaction('rw', db.passages, db.sessions, async () => {
        const passage = await db.passages.get(passageId)
        if (!passage) throw new Error('找不到這個樂段，可能已被刪除')

        const today = toDateKey(now)
        const session: Session = {
          id: newId(),
          passageId,
          pieceId: passage.pieceId,
          dateKey: today,
          ...result,
        }
        await db.sessions.add(session)

        const next = nextSchedule(
          { due: passage.due, intervalDays: passage.intervalDays },
          result.rating,
          result.coldTest,
          today,
        )
        await db.passages.update(passageId, {
          currentBpm: result.bpmEnd,
          patternId: result.patternId,
          groupSize: result.groupSize,
          tempoMode: result.tempoMode,
          due: next.due,
          intervalDays: next.intervalDays,
          lastPracticedAt: now.getTime(),
          lastNote: result.note,
        })
        return session
      })
    },
  }
}

export const repo = createRepo()
