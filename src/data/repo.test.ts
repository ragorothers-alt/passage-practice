import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { type AppDb, createDb } from './db'
import { createRepo, type SessionResult } from './repo'

let db: AppDb
let repo: ReturnType<typeof createRepo>
let n = 0

beforeEach(() => {
  db = createDb(`test-${n++}`)
  repo = createRepo(db)
})

const result: SessionResult = {
  startedAt: 0,
  durationSec: 300,
  patternId: 'dotted:ls',
  groupSize: 6,
  tempoMode: 'keepShort',
  bpmStart: 40,
  bpmEnd: 52,
  rating: 'smooth',
  coldTest: null,
  note: '',
}

async function seed() {
  const piece = await repo.createPiece({ title: '敘事曲', composer: '蕭邦', instrument: 'piano' })
  const passage = await repo.createPassage(
    { pieceId: piece.id, title: '右手跑動', focus: '', crops: [], origin: null, groupSize: 6, targetBpm: 60, currentBpm: 40 },
    '2026-11-12',
  )
  return { piece, passage }
}

describe('資料層', () => {
  it('新樂段當天到期，預設原節奏', async () => {
    const { passage } = await seed()
    expect(passage.due).toBe('2026-11-12')
    expect(passage.patternId).toBe('even')
    expect(passage.lastPracticedAt).toBeNull()
  })

  it('存下練習後，樂段記住速度、節奏型與下次複習日', async () => {
    const { passage } = await seed()
    await repo.recordSession(passage.id, result, new Date(2026, 10, 12, 20, 0))
    const saved = (await db.passages.get(passage.id))!
    expect(saved.currentBpm).toBe(52)
    expect(saved.patternId).toBe('dotted:ls')
    expect(saved.tempoMode).toBe('keepShort')
    expect(saved.due).toBe('2026-11-13')
    expect(saved.intervalDays).toBe(1)
    expect(saved.lastNote).toBe('')
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.toArray())[0]!.dateKey).toBe('2026-11-12')
  })

  it('冷啟動通過會把間隔拉長，沒過則隔天再來', async () => {
    const { passage } = await seed()
    await repo.recordSession(passage.id, { ...result, coldTest: 'pass' }, new Date(2026, 10, 12))
    expect((await db.passages.get(passage.id))!.due).toBe('2026-11-14')
    await repo.recordSession(passage.id, { ...result, coldTest: 'pass' }, new Date(2026, 10, 14))
    expect((await db.passages.get(passage.id))!.due).toBe('2026-11-18')
    await repo.recordSession(passage.id, { ...result, coldTest: 'fail' }, new Date(2026, 10, 18))
    expect((await db.passages.get(passage.id))!.due).toBe('2026-11-19')
  })

  it('練完寫下的未解決事項會留在樂段上，下次沒寫就清掉', async () => {
    const { passage } = await seed()
    await repo.recordSession(passage.id, { ...result, note: '第二組進第三組會停頓' })
    expect((await db.passages.get(passage.id))!.lastNote).toBe('第二組進第三組會停頓')
    await repo.recordSession(passage.id, result)
    expect((await db.passages.get(passage.id))!.lastNote).toBe('')
  })

  it('刪除曲目會一併刪除樂段與紀錄', async () => {
    const { piece, passage } = await seed()
    await repo.recordSession(passage.id, result)
    await repo.deletePiece(piece.id)
    expect(await db.pieces.count()).toBe(0)
    expect(await db.passages.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
  })

  it('刪除原始樂譜後，樂段仍在，只是失去來源', async () => {
    const { piece } = await seed()
    const source = await repo.addSource(piece.id, { name: 'a.pdf', blob: new Blob([]), kind: 'pdf', pageCount: 3 })
    const p = await repo.createPassage({
      pieceId: piece.id,
      title: 'x',
      focus: '',
      crops: [],
      groupSize: 4,
      targetBpm: 60,
      currentBpm: 40,
      origin: { sourceId: source.id, parts: [{ page: 2, rects: [{ x: 0, y: 0, w: 1, h: 0.2 }] }] },
    })
    await repo.deleteSource(source.id)
    expect((await db.passages.get(p.id))!.origin).toBeNull()
    expect(await db.sources.count()).toBe(0)
  })

  it('記錄不存在的樂段會報錯', async () => {
    await expect(repo.recordSession('nope', result)).rejects.toThrow('找不到這個樂段')
  })
})
