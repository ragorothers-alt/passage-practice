import { describe, expect, it } from 'vitest'
import { ladderStep, startLadder, type LadderConfig } from './ladder'
import { buildCycle, findPattern, GROUP_SIZES, patternsFor } from './rhythm'
import { addDays, daysBetween, isDue, newSchedule, nextInterval, nextSchedule, toDateKey } from './schedule'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('節奏型', () => {
  it('每種分組大小的節奏型 id 都不重複', () => {
    for (const n of GROUP_SIZES) {
      const ids = patternsFor(n).map(p => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('除了爆發與落點，每一輪的音數都是分組大小的整數倍', () => {
    for (const n of GROUP_SIZES) {
      for (const p of patternsFor(n)) {
        if (p.family === 'burst') {
          expect(p.notes).toHaveLength(n + 1)
        }
        else {
          expect(p.notes.length % n).toBe(0)
          expect(p.notes.length / n).toBe(p.beats)
        }
      }
    }
  })

  it('每一輪至少有一個重音，且第一個音一定是組的開頭', () => {
    for (const n of GROUP_SIZES) {
      for (const p of patternsFor(n)) {
        expect(p.notes.some(x => x.accent)).toBe(true)
        expect(p.notes[0]!.groupStart).toBe(true)
      }
    }
  })

  it('六個音一組：有 3+3 與 2+2+2、三音輪替、六種停留', () => {
    const ps = patternsFor(6)
    const ids = ps.map(p => p.id)
    expect(ids).toContain('split:3+3')
    expect(ids).toContain('split:2+2+2')
    expect(ps.filter(p => p.family === 'triple')).toHaveLength(3)
    expect(ps.filter(p => p.family === 'long')).toHaveLength(6)
    expect(ps.filter(p => p.family === 'accent')).toHaveLength(5)
  })

  it('五個音一組：長短要跨兩組才對齊，重音分組是 2+3 與 3+2', () => {
    const ps = patternsFor(5)
    const dotted = ps.find(p => p.id === 'dotted:ls')!
    expect(dotted.notes).toHaveLength(10)
    expect(dotted.beats).toBe(2)
    expect(dotted.notes.filter(x => x.groupStart).map(x => dotted.notes.indexOf(x))).toEqual([0, 5])
    expect(ps.filter(p => p.family === 'split').map(p => p.label).sort()).toEqual(['2+3', '3+2'])
    expect(ps.some(p => p.family === 'triple')).toBe(false)
  })

  it('兩個、三個音一組不提供停留', () => {
    expect(patternsFor(2).some(p => p.family === 'long')).toBe(false)
    expect(patternsFor(3).some(p => p.family === 'long')).toBe(false)
  })

  it('找不到的 id 會退回原節奏', () => {
    expect(findPattern(4, 'triple:1').id).toBe('even')
    expect(findPattern(4, undefined).id).toBe('even')
    expect(findPattern(6, 'triple:2').id).toBe('triple:2')
  })
})

describe('速度換算', () => {
  it('原節奏：每個音等長，一輪剛好一拍', () => {
    const c = buildCycle(findPattern(6, 'even'), 60, 'keepPulse')
    expect(c.duration).toBeCloseTo(1)
    for (const n of c.notes) expect(n.duration).toBeCloseTo(1 / 6)
    expect(c.fastestEquivalentBpm).toBeCloseTo(60)
  })

  it('維持拍點的長短節奏：短音比原節奏快一倍', () => {
    const c = buildCycle(findPattern(4, 'dotted:ls'), 60, 'keepPulse')
    expect(c.duration).toBeCloseTo(1)
    expect(c.notes.map(n => n.duration)).toEqual([0.375, 0.125, 0.375, 0.125])
    expect(c.fastestEquivalentBpm).toBeCloseTo(120)
  })

  it('短音不加速：最短的音等於原節奏的一個音，整輪變長', () => {
    const c = buildCycle(findPattern(4, 'dotted:ls'), 60, 'keepShort')
    expect(Math.min(...c.notes.map(n => n.duration))).toBeCloseTo(0.25)
    expect(c.duration).toBeCloseTo(2)
    expect(c.fastestEquivalentBpm).toBeCloseTo(60)
  })

  it('任何節奏型在維持拍點時，一輪長度都等於拍數', () => {
    for (const n of GROUP_SIZES) {
      for (const p of patternsFor(n)) {
        const c = buildCycle(p, 80, 'keepPulse')
        expect(c.duration).toBeCloseTo(p.beats * 0.75)
        expect(sum(c.notes.map(x => x.duration))).toBeCloseTo(c.duration)
      }
    }
  })

  it('拍點等距；五個音套短長時，第二組的開頭落在拍點之前', () => {
    const c = buildCycle(findPattern(5, 'dotted:sl'), 60, 'keepPulse')
    expect(c.pulses[0]).toBeCloseTo(0)
    expect(c.pulses[1]).toBeCloseTo(1)
    const starts = c.notes.filter(n => n.groupStart).map(n => n.offset)
    expect(starts[0]).toBeCloseTo(0)
    expect(starts[1]).toBeCloseTo(0.9)
  })

  it('四個音一組時，拍點剛好對到每組的第一個音', () => {
    const c = buildCycle(findPattern(4, 'long:3'), 90, 'keepPulse')
    expect(c.pulses).toHaveLength(1)
    expect(c.notes[0]!.offset).toBe(0)
  })

  it('爆發與落點兩種算法結果相同：落點停滿一拍', () => {
    const p = findPattern(4, 'burst')
    const a = buildCycle(p, 60, 'keepPulse')
    const b = buildCycle(p, 60, 'keepShort')
    expect(a.duration).toBeCloseTo(2)
    expect(b.duration).toBeCloseTo(2)
    expect(a.notes[4]!.offset).toBeCloseTo(1)
    expect(a.fastestEquivalentBpm).toBeCloseTo(60)
  })
})

describe('速度階梯', () => {
  const config: LadderConfig = { startBpm: 60, targetBpm: 68, step: 4, cleanReps: 3 }

  it('連續乾淨三次才升一階', () => {
    let s = startLadder(config)
    s = ladderStep(s, config, 'clean')
    s = ladderStep(s, config, 'clean')
    expect(s.bpm).toBe(60)
    expect(s.streak).toBe(2)
    s = ladderStep(s, config, 'clean')
    expect(s.bpm).toBe(64)
    expect(s.streak).toBe(0)
    expect(s.best).toBe(60)
  })

  it('失誤會把連續次數歸零', () => {
    let s = startLadder(config)
    s = ladderStep(s, config, 'clean')
    s = ladderStep(s, config, 'clean')
    s = ladderStep(s, config, 'miss')
    expect(s.streak).toBe(0)
    expect(s.bpm).toBe(60)
  })

  it('連續兩次失誤退一階，但不低於起始速度', () => {
    let s = { ...startLadder(config), bpm: 64 }
    s = ladderStep(s, config, 'miss')
    expect(s.bpm).toBe(64)
    s = ladderStep(s, config, 'miss')
    expect(s.bpm).toBe(60)
    s = ladderStep(s, config, 'miss')
    s = ladderStep(s, config, 'miss')
    expect(s.bpm).toBe(60)
  })

  it('在目標速度通過後標記完成，速度不再往上加', () => {
    let s = startLadder(config)
    for (let i = 0; i < 9; i++) s = ladderStep(s, config, 'clean')
    expect(s.bpm).toBe(68)
    expect(s.done).toBe(true)
    expect(s.best).toBe(68)
    s = ladderStep(s, config, 'clean')
    expect(s.bpm).toBe(68)
  })

  it('最後一階不會超過目標速度', () => {
    const c: LadderConfig = { startBpm: 60, targetBpm: 66, step: 4, cleanReps: 1 }
    let s = startLadder(c)
    s = ladderStep(s, c, 'clean')
    s = ladderStep(s, c, 'clean')
    expect(s.bpm).toBe(66)
  })
})

describe('複習排程', () => {
  it('日期換算', () => {
    expect(toDateKey(new Date(2026, 10, 12))).toBe('2026-11-12')
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-11-12', '2026-11-15')).toBe(3)
    expect(daysBetween('2026-11-15', '2026-11-12')).toBe(-3)
  })

  it('新樂段當天就該練', () => {
    expect(isDue(newSchedule('2026-11-12'), '2026-11-12')).toBe(true)
    expect(isDue({ due: '2026-11-13', intervalDays: 1 }, '2026-11-12')).toBe(false)
  })

  it('冷啟動沒過，不管自評如何都隔天再來', () => {
    expect(nextInterval(8, 'smooth', 'fail')).toBe(1)
    expect(nextInterval(8, 'stuck', 'fail')).toBe(1)
  })

  it('冷啟動通過且自評順了，間隔加倍，上限三十天', () => {
    expect(nextInterval(0, 'smooth', 'pass')).toBe(2)
    expect(nextInterval(2, 'smooth', 'pass')).toBe(4)
    expect(nextInterval(20, 'smooth', 'pass')).toBe(30)
  })

  it('冷啟動通過但練習時還會卡，間隔不變', () => {
    expect(nextInterval(4, 'stuck', 'pass')).toBe(4)
    expect(nextInterval(0, 'slower', 'pass')).toBe(1)
  })

  it('沒做冷啟動，只靠自評最多拉到三天', () => {
    expect(nextInterval(0, 'smooth', null)).toBe(1)
    expect(nextInterval(1, 'smooth', null)).toBe(2)
    expect(nextInterval(3, 'smooth', null)).toBe(3)
    expect(nextInterval(3, 'stuck', null)).toBe(1)
  })

  it('下次日期從今天起算', () => {
    const next = nextSchedule({ due: '2026-11-10', intervalDays: 2 }, 'smooth', 'pass', '2026-11-12')
    expect(next).toEqual({ due: '2026-11-16', intervalDays: 4 })
  })
})
