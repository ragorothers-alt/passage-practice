import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { decodeBlob, encodeBlob, exportBackup, importBackup, parseBackup } from './backup'
import { createDb } from './db'
import { createRepo } from './repo'

describe('備份', () => {
  it('二進位內容編碼後能完整還原', async () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 31) % 256)
    const encoded = await encodeBlob(new Blob([bytes], { type: 'image/webp' }))
    const back = decodeBlob(encoded)
    expect(back.type).toBe('image/webp')
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(bytes)
  })

  it('不是備份檔會被拒絕，並說明原因', () => {
    expect(() => parseBackup('abc')).toThrow('不是有效的備份檔')
    expect(() => parseBackup('{"format":"other"}')).toThrow('不是樂段練習的備份檔')
    expect(() => parseBackup(JSON.stringify({ format: 'passage-practice-backup', version: 99 }))).toThrow('較新的版本')
    expect(() => parseBackup(JSON.stringify({ format: 'passage-practice-backup', version: 1 }))).toThrow('不完整')
  })

  it('匯出再匯入到另一個資料庫，曲目、樂段與紀錄都還在', async () => {
    const a = createDb('backup-a')
    const repoA = createRepo(a)
    const piece = await repoA.createPiece({ title: '協奏曲', composer: '', instrument: 'violin' })
    const passage = await repoA.createPassage({
      pieceId: piece.id,
      title: '獨奏進場',
      focus: '五連音',
      crops: [],
      origin: null,
      groupSize: 5,
      targetBpm: 72,
      currentBpm: 50,
    })
    await repoA.recordSession(passage.id, {
      startedAt: 1,
      durationSec: 60,
      patternId: 'split:2+3',
      groupSize: 5,
      tempoMode: 'keepPulse',
      bpmStart: 50,
      bpmEnd: 56,
      rating: 'stuck',
      coldTest: null,
      note: '換把不準',
    })

    const text = JSON.stringify(await exportBackup({ includeSources: true }, a))

    const b = createDb('backup-b')
    await createRepo(b).createPiece({ title: '會被取代', composer: '', instrument: 'piano' })
    await importBackup(parseBackup(text), b)

    expect((await b.pieces.toArray()).map(p => p.title)).toEqual(['協奏曲'])
    const restored = (await b.passages.toArray())[0]!
    expect(restored.patternId).toBe('split:2+3')
    expect(restored.currentBpm).toBe(56)
    expect((await b.sessions.toArray())[0]!.note).toBe('換把不準')
  })
})
