/**
 * 節奏型：把「一組等長的音」改成不同的長短或重音排列。
 * 這裡只處理節奏，不碰音高，所以不需要先辨識樂譜。
 */

export const GROUP_SIZES = [2, 3, 4, 5, 6] as const
export type GroupSize = (typeof GROUP_SIZES)[number]

export type PatternFamily = 'even' | 'split' | 'dotted' | 'triple' | 'long' | 'accent' | 'burst'

export interface RhythmNote {
  /** 相對長度，1 代表原本一個音的長度單位 */
  weight: number
  accent: boolean
  /** 這個音是否落在原本某一組的第一個音上 */
  groupStart: boolean
}

export interface RhythmPattern {
  id: string
  family: PatternFamily
  groupSize: GroupSize
  /** 在同一類裡的短名稱，例如「長短」「第 3 音」 */
  label: string
  /** 一輪節奏型裡的所有音 */
  notes: RhythmNote[]
  /** 維持拍點時，一輪佔幾拍（一拍 = 原本的一組音） */
  beats: number
}

export interface FamilyInfo {
  family: PatternFamily
  name: string
  purpose: string
}

export const FAMILIES: Record<PatternFamily, FamilyInfo> = {
  even: {
    family: 'even',
    name: '原節奏',
    purpose: '照原譜彈。用來檢查變形練習有沒有真的讓原曲更穩。',
  },
  split: {
    family: 'split',
    name: '重音分組',
    purpose: '節奏不變，改變重音怎麼分組，讓手不依賴固定的重音位置。',
  },
  dotted: {
    family: 'dotted',
    name: '長短',
    purpose: '每兩個音一長一短。短音接到下一個長音的動作會被練快，長音給你時間準備。',
  },
  triple: {
    family: 'triple',
    name: '三音輪替',
    purpose: '每三個音有一個長音，長音輪流換位置，三種都練過才算完整。',
  },
  long: {
    family: 'long',
    name: '停留',
    purpose: '停在每組的某一個音，其餘快速帶過。輪流換停留位置，找出最弱的接續。',
  },
  accent: {
    family: 'accent',
    name: '重音位移',
    purpose: '節奏不變，把重音移到每組的另一個音，練均勻與手指獨立。',
  },
  burst: {
    family: 'burst',
    name: '爆發與落點',
    purpose: '一口氣彈完一組並落在下一組的第一個音，然後停一拍準備下一次。',
  },
}

export const FAMILY_ORDER: PatternFamily[] = ['even', 'dotted', 'triple', 'long', 'accent', 'split', 'burst']

function note(weight: number, accent: boolean, groupStart: boolean): RhythmNote {
  return { weight, accent, groupStart }
}

/** 把一串長度套到連續的音上，組的第一個音自動加重音 */
function fromWeights(n: number, weights: number[]): RhythmNote[] {
  return weights.map((w, i) => note(w, i % n === 0, i % n === 0))
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** 把一個 size 個音的小單位重複到剛好對齊組的邊界，回傳重複幾次與涵蓋幾組 */
function tile(n: number, unitSize: number): { repeats: number; groups: number } {
  const total = (n * unitSize) / gcd(n, unitSize)
  return { repeats: total / unitSize, groups: total / n }
}

function repeat<T>(unit: T[], times: number): T[] {
  return Array.from({ length: times }, () => unit).flat()
}

/** n 拆成 2 與 3 的所有排列（至少兩段） */
function splits(n: number): number[][] {
  const out: number[][] = []
  const walk = (rest: number, acc: number[]) => {
    if (rest === 0) {
      if (acc.length > 1) out.push(acc)
      return
    }
    for (const part of [2, 3]) {
      if (part <= rest) walk(rest - part, [...acc, part])
    }
  }
  walk(n, [])
  return out
}

const ORDINALS = ['一', '二', '三', '四', '五', '六']

export function patternsFor(n: GroupSize): RhythmPattern[] {
  const list: RhythmPattern[] = []
  const ones = Array.from({ length: n }, () => 1)

  list.push({
    id: 'even',
    family: 'even',
    groupSize: n,
    label: '原節奏',
    notes: fromWeights(n, ones),
    beats: 1,
  })

  // 長短／短長：兩個音一對。奇數組要兩組才會對齊。
  {
    const { repeats, groups } = tile(n, 2)
    list.push({
      id: 'dotted:ls',
      family: 'dotted',
      groupSize: n,
      label: '長短',
      notes: fromWeights(n, repeat([3, 1], repeats)),
      beats: groups,
    })
    list.push({
      id: 'dotted:sl',
      family: 'dotted',
      groupSize: n,
      label: '短長',
      notes: fromWeights(n, repeat([1, 3], repeats)),
      beats: groups,
    })
  }

  // 三音輪替：只在一組能被三整除時提供，避免跨太多組難以掌握
  if (n % 3 === 0) {
    const units: [string, number[]][] = [
      ['長短短', [2, 1, 1]],
      ['短長短', [1, 2, 1]],
      ['短短長', [1, 1, 2]],
    ]
    units.forEach(([label, unit], i) => {
      list.push({
        id: `triple:${i + 1}`,
        family: 'triple',
        groupSize: n,
        label,
        notes: fromWeights(n, repeat(unit, n / 3)),
        beats: 1,
      })
    })
  }

  // 停留：四個音以上才有意義（較小的組已被長短、三音輪替涵蓋）
  if (n >= 4) {
    for (let k = 0; k < n; k++) {
      const weights = ones.map((_, i) => (i === k ? 3 : 1))
      list.push({
        id: `long:${k + 1}`,
        family: 'long',
        groupSize: n,
        label: `停第${ORDINALS[k]}音`,
        notes: fromWeights(n, weights),
        beats: 1,
      })
    }
  }

  // 重音位移：第一音的重音就是原節奏，所以從第二音開始
  for (let k = 1; k < n; k++) {
    list.push({
      id: `accent:${k + 1}`,
      family: 'accent',
      groupSize: n,
      label: `重音在第${ORDINALS[k]}音`,
      notes: ones.map((w, i) => note(w, i === k, i === 0)),
      beats: 1,
    })
  }

  for (const parts of splits(n)) {
    const starts = new Set<number>()
    let pos = 0
    for (const p of parts) {
      starts.add(pos)
      pos += p
    }
    list.push({
      id: `split:${parts.join('+')}`,
      family: 'split',
      groupSize: n,
      label: parts.join('+'),
      notes: ones.map((w, i) => note(w, starts.has(i), i === 0)),
      beats: 1,
    })
  }

  // 爆發與落點：n 個音加上下一組的第一個音，落點停滿一拍
  list.push({
    id: 'burst',
    family: 'burst',
    groupSize: n,
    label: '爆發與落點',
    notes: [...fromWeights(n, ones), note(n, true, true)],
    beats: 2,
  })

  return list
}

export function findPattern(n: GroupSize, id: string | undefined): RhythmPattern {
  const all = patternsFor(n)
  return all.find(p => p.id === id) ?? all[0]!
}

export function isGroupSize(n: number): n is GroupSize {
  return (GROUP_SIZES as readonly number[]).includes(n)
}

/**
 * 速度的兩種算法：
 * - keepPulse：拍點不變，長音變長、短音就會比原節奏快
 * - keepShort：最短的音維持原節奏的速度，長音多出來的時間直接加上去
 */
export type TempoMode = 'keepPulse' | 'keepShort'

export interface TimedNote extends RhythmNote {
  /** 距離這一輪開頭的秒數 */
  offset: number
  duration: number
}

export interface Cycle {
  notes: TimedNote[]
  duration: number
  /**
   * 拍點距離這一輪開頭的秒數。拍點是等距的，不一定剛好對到某個音：
   * 例如五個音一組套長短節奏時，第二組的開頭會落在拍點之前。
   */
  pulses: number[]
  /** 最短的音換算回原節奏時，相當於每分鐘幾拍 */
  fastestEquivalentBpm: number
}

/** bpm 指的是「一組音一拍」的速度 */
export function buildCycle(pattern: RhythmPattern, bpm: number, mode: TempoMode): Cycle {
  const beat = 60 / bpm
  const original = beat / pattern.groupSize
  const weights = pattern.notes.map(n => n.weight)
  const total = weights.reduce((a, b) => a + b, 0)
  const min = Math.min(...weights)

  const unit = mode === 'keepPulse' ? (pattern.beats * beat) / total : original / min

  let offset = 0
  const notes = pattern.notes.map((n) => {
    const timed: TimedNote = { ...n, offset, duration: n.weight * unit }
    offset += timed.duration
    return timed
  })

  return {
    notes,
    duration: offset,
    pulses: Array.from({ length: pattern.beats }, (_, k) => (k * offset) / pattern.beats),
    fastestEquivalentBpm: bpm * (original / (min * unit)),
  }
}
