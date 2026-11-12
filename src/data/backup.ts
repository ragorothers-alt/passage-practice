/**
 * 備份：資料只存在這台裝置的瀏覽器裡，所以要能匯出成一個檔案帶走。
 * 圖片與 PDF 轉成 base64 放進 JSON。
 */
import type { Passage, Piece, Session, Source } from '@/domain/types'
import { type AppDb, db as defaultDb } from './db'

export const BACKUP_FORMAT = 'passage-practice-backup'
export const BACKUP_VERSION = 1

interface EncodedBlob {
  type: string
  base64: string
}

type Encoded<T, K extends keyof T> = Omit<T, K> & Record<K, T[K] extends Blob[] ? EncodedBlob[] : EncodedBlob>

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  pieces: Piece[]
  sources: Encoded<Source, 'blob'>[]
  passages: Encoded<Passage, 'crops'>[]
  sessions: Session[]
}

export async function encodeBlob(blob: Blob): Promise<EncodedBlob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return { type: blob.type, base64: btoa(binary) }
}

export function decodeBlob(encoded: EncodedBlob): Blob {
  const binary = atob(encoded.base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: encoded.type })
}

export interface ExportOptions {
  /** 是否包含原始樂譜檔。不包含時檔案小很多，樂段的框選圖片仍會保留。 */
  includeSources: boolean
}

export async function exportBackup(options: ExportOptions, db: AppDb = defaultDb): Promise<BackupFile> {
  const [pieces, sources, passages, sessions] = await Promise.all([
    db.pieces.toArray(),
    options.includeSources ? db.sources.toArray() : Promise.resolve([] as Source[]),
    db.passages.toArray(),
    db.sessions.toArray(),
  ])

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    pieces,
    sources: await Promise.all(sources.map(async s => ({ ...s, blob: await encodeBlob(s.blob) }))),
    passages: await Promise.all(
      passages.map(async p => ({
        ...p,
        origin: options.includeSources ? p.origin : null,
        crops: await Promise.all(p.crops.map(encodeBlob)),
      })),
    ),
    sessions,
  }
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  }
  catch {
    throw new Error('這個檔案不是有效的備份檔')
  }
  const file = data as Partial<BackupFile>
  if (file?.format !== BACKUP_FORMAT) throw new Error('這個檔案不是樂段練習的備份檔')
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new Error('這個備份檔來自較新的版本，請先更新 App')
  }
  for (const key of ['pieces', 'sources', 'passages', 'sessions'] as const) {
    if (!Array.isArray(file[key])) throw new Error('備份檔內容不完整')
  }
  return file as BackupFile
}

/** 以備份檔取代目前的所有資料 */
export async function importBackup(file: BackupFile, db: AppDb = defaultDb): Promise<void> {
  const sources: Source[] = file.sources.map(s => ({ ...s, blob: decodeBlob(s.blob) }))
  const passages: Passage[] = file.passages.map(p => ({ ...p, crops: p.crops.map(decodeBlob) }))

  await db.transaction('rw', db.pieces, db.sources, db.passages, db.sessions, async () => {
    await Promise.all([db.pieces.clear(), db.sources.clear(), db.passages.clear(), db.sessions.clear()])
    await db.pieces.bulkAdd(file.pieces)
    await db.sources.bulkAdd(sources)
    await db.passages.bulkAdd(passages)
    await db.sessions.bulkAdd(file.sessions)
  })
}
