/**
 * 節拍器引擎：用 Web Audio 的時鐘預先排好聲音，避免 setTimeout 的抖動。
 * 一次排一整輪節奏型；速度或節奏型改變時，從下一輪開始生效。
 */
import { type Cycle, type RhythmPattern, type TempoMode, buildCycle } from '@/domain/rhythm'

export interface MetronomeSettings {
  pattern: RhythmPattern
  bpm: number
  mode: TempoMode
  /** 每個音都打一聲 */
  rhythmSound: boolean
  /** 另外打出等距的拍點 */
  pulseSound: boolean
  /** 開始前的預備拍數 */
  countInBeats: number
}

/** 畫面要顯示的事件：正數是節奏型裡第幾個音，負數是預備拍倒數 */
export type MetronomeTick =
  | { kind: 'note', index: number }
  | { kind: 'countIn', remaining: number }

interface Scheduled {
  time: number
  tick: MetronomeTick
}

const LOOKAHEAD_SEC = 0.15
const TIMER_MS = 25

export class Metronome {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private raf = 0
  private nextCycleAt = 0
  private queue: Scheduled[] = []
  private settings: MetronomeSettings

  onTick: (tick: MetronomeTick | null) => void = () => {}

  constructor(settings: MetronomeSettings) {
    this.settings = settings
  }

  get playing(): boolean {
    return this.timer !== null
  }

  update(settings: MetronomeSettings): void {
    this.settings = settings
  }

  async start(): Promise<void> {
    if (this.playing) return
    this.ctx ??= new AudioContext({ latencyHint: 'interactive' })
    if (this.ctx.state !== 'running') await this.ctx.resume()

    // 每次開始都用新的輸出節點，停止時整個拔掉，已排定的聲音就不會再響
    this.out = this.ctx.createGain()
    this.out.connect(this.ctx.destination)

    let t = this.ctx.currentTime + 0.12
    const beat = 60 / this.settings.bpm
    for (let i = 0; i < this.settings.countInBeats; i++) {
      this.click(t, 660, 0.5, 0.05, 'sine')
      this.queue.push({ time: t, tick: { kind: 'countIn', remaining: this.settings.countInBeats - i } })
      t += beat
    }
    this.nextCycleAt = t

    this.timer = setInterval(() => this.schedule(), TIMER_MS)
    this.schedule()
    this.raf = requestAnimationFrame(() => this.draw())
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    cancelAnimationFrame(this.raf)
    this.out?.disconnect()
    this.out = null
    this.queue = []
    this.onTick(null)
  }

  dispose(): void {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }

  private schedule(): void {
    const ctx = this.ctx
    if (!ctx) return
    // 計時器被系統延遲（例如 App 被切到背景）而落後時，從現在重新開始，
    // 不要把錯過的聲音一次補播出來
    if (this.nextCycleAt < ctx.currentTime) this.nextCycleAt = ctx.currentTime + 0.05
    while (this.nextCycleAt < ctx.currentTime + LOOKAHEAD_SEC) {
      const { pattern, bpm, mode } = this.settings
      const cycle = buildCycle(pattern, bpm, mode)
      this.scheduleCycle(cycle, this.nextCycleAt)
      this.nextCycleAt += cycle.duration
    }
  }

  private scheduleCycle(cycle: Cycle, start: number): void {
    const { rhythmSound, pulseSound } = this.settings
    cycle.notes.forEach((n, index) => {
      const time = start + n.offset
      if (rhythmSound) {
        if (n.accent) this.click(time, 1568, 0.85, 0.06, 'triangle')
        else this.click(time, 1046, 0.4, 0.04, 'triangle')
      }
      this.queue.push({ time, tick: { kind: 'note', index } })
    })
    if (pulseSound) {
      for (const offset of cycle.pulses) this.click(start + offset, 330, 0.6, 0.07, 'square')
    }
  }

  private click(time: number, freq: number, gain: number, length: number, type: OscillatorType): void {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.0001, time)
    env.gain.exponentialRampToValueAtTime(gain, time + 0.002)
    env.gain.exponentialRampToValueAtTime(0.0001, time + length)
    osc.connect(env).connect(out)
    osc.start(time)
    osc.stop(time + length + 0.02)
  }

  /** 依音訊時鐘把畫面的亮點對上聲音，並補上裝置的輸出延遲 */
  private draw(): void {
    const ctx = this.ctx
    if (!ctx || !this.playing) return
    const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0)
    let latest: MetronomeTick | undefined
    while (this.queue.length > 0 && this.queue[0]!.time <= now) {
      latest = this.queue.shift()!.tick
    }
    if (latest) this.onTick(latest)
    this.raf = requestAnimationFrame(() => this.draw())
  }
}
