import type { GroupSize, TempoMode } from './rhythm'
import type { ColdTest, Rating } from './schedule'

export type Instrument = 'piano' | 'violin'

export const INSTRUMENT_NAMES: Record<Instrument, string> = {
  piano: '鋼琴',
  violin: '小提琴',
}

export interface Piece {
  id: string
  title: string
  composer: string
  instrument: Instrument
  createdAt: number
}

/** 上傳的原始樂譜檔 */
export interface Source {
  id: string
  pieceId: string
  kind: 'pdf' | 'image'
  name: string
  blob: Blob
  pageCount: number
  /** 上次框選時停在第幾頁（從 1 開始） */
  lastPage: number
  createdAt: number
}

/** 框選範圍，數值是佔整頁的比例（0 到 1） */
export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface PassageOriginPart {
  page: number
  rects: CropRect[]
}

/** 樂段是從哪份樂譜的哪些位置框出來的；跨頁的樂段會有多個部分 */
export interface PassageOrigin {
  sourceId: string
  parts: PassageOriginPart[]
}

export interface Passage {
  id: string
  pieceId: string
  title: string
  /** 這段主要卡在哪裡，由使用者自己寫 */
  focus: string
  /** 框選下來的譜面圖片，依序由上往下顯示 */
  crops: Blob[]
  origin: PassageOrigin | null
  groupSize: GroupSize
  /** 目標速度，一拍 = 一組音 */
  targetBpm: number
  /** 上次練到的速度 */
  currentBpm: number
  patternId: string
  tempoMode: TempoMode
  /** 複習排程，拆成頂層欄位方便用日期查詢 */
  due: string
  intervalDays: number
  lastPracticedAt: number | null
  /** 上次練完時寫下的「還沒解決的地方」，下次打開時提醒 */
  lastNote: string
  createdAt: number
}

export interface Session {
  id: string
  passageId: string
  pieceId: string
  startedAt: number
  /** 這次練習的日期，YYYY-MM-DD（本地時間） */
  dateKey: string
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

export const RATING_NAMES: Record<Rating, string> = {
  smooth: '順了',
  stuck: '還會卡',
  slower: '需要降速',
}
