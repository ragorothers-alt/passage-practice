<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import type { LoadedPages } from '@/data/pages'
import type { CropRect } from '@/domain/types'

const props = defineProps<{
  pages: LoadedPages
  page: number
}>()

const rects = defineModel<CropRect[]>('rects', { required: true })

const scroller = useTemplateRef<HTMLDivElement>('scroller')
const sheet = useTemplateRef<HTMLDivElement>('sheet')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const rendering = shallowRef(false)
const failed = shallowRef(false)

/** 框的最小邊長（佔整頁的比例），避免拉到看不見 */
const MIN = 0.02

type Edge = 'n' | 's' | 'e' | 'w'
const HANDLES: Edge[][] = [['n'], ['s'], ['e'], ['w'], ['n', 'w'], ['n', 'e'], ['s', 'w'], ['s', 'e']]

let renderToken = 0

async function render() {
  const target = canvas.value
  const host = scroller.value
  if (!target || !host) return
  const token = ++renderToken
  rendering.value = true
  failed.value = false
  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const drawn = await props.pages.render(props.page, host.clientWidth * dpr)
    if (token !== renderToken) return
    target.width = drawn.width
    target.height = drawn.height
    const ctx = target.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, drawn.width, drawn.height)
    ctx.drawImage(drawn, 0, 0)
  }
  catch {
    if (token === renderToken) failed.value = true
  }
  finally {
    if (token === renderToken) rendering.value = false
  }
}

watch(() => [props.pages, props.page], () => {
  scroller.value?.scrollTo({ top: 0 })
  void render()
})

let observer: ResizeObserver | undefined
let lastWidth = 0
let resizeTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  void render()
  lastWidth = scroller.value?.clientWidth ?? 0
  observer = new ResizeObserver(() => {
    const width = scroller.value?.clientWidth ?? 0
    if (width === lastWidth) return
    lastWidth = width
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => void render(), 200)
  })
  if (scroller.value) observer.observe(scroller.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(resizeTimer)
})

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 在目前看得到的畫面中央加一個橫跨整頁的框，剛好是一行譜的形狀 */
function addRect() {
  const host = scroller.value
  const page = sheet.value
  if (!host || !page || page.clientHeight === 0) return
  const h = 0.13
  const center = (host.scrollTop + host.clientHeight / 2) / page.clientHeight
  const y = clamp(center - h / 2, 0, 1 - h)
  rects.value = [...rects.value, { x: 0.03, y, w: 0.94, h }]
}

function removeRect(index: number) {
  rects.value = rects.value.filter((_, i) => i !== index)
}

interface Drag {
  index: number
  edges: Edge[] | null
  startX: number
  startY: number
  origin: CropRect
}
let drag: Drag | null = null

function onDown(event: PointerEvent, index: number, edges: Edge[] | null) {
  const origin = rects.value[index]
  if (!origin) return
  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  drag = { index, edges, startX: event.clientX, startY: event.clientY, origin: { ...origin } }
}

function onMove(event: PointerEvent) {
  const page = sheet.value
  if (!drag || !page) return
  const dx = (event.clientX - drag.startX) / page.clientWidth
  const dy = (event.clientY - drag.startY) / page.clientHeight
  const o = drag.origin
  const next = { ...o }

  if (drag.edges === null) {
    next.x = clamp(o.x + dx, 0, 1 - o.w)
    next.y = clamp(o.y + dy, 0, 1 - o.h)
  }
  else {
    if (drag.edges.includes('w')) {
      next.x = clamp(o.x + dx, 0, o.x + o.w - MIN)
      next.w = o.x + o.w - next.x
    }
    if (drag.edges.includes('e')) next.w = clamp(o.w + dx, MIN, 1 - o.x)
    if (drag.edges.includes('n')) {
      next.y = clamp(o.y + dy, 0, o.y + o.h - MIN)
      next.h = o.y + o.h - next.y
    }
    if (drag.edges.includes('s')) next.h = clamp(o.h + dy, MIN, 1 - o.y)
  }

  const index = drag.index
  rects.value = rects.value.map((r, i) => (i === index ? next : r))
}

function onUp() {
  drag = null
}

const percent = (v: number) => `${v * 100}%`
</script>

<template>
  <div class="cropper">
    <div ref="scroller" class="cropper-scroll">
      <div ref="sheet" class="cropper-sheet sheet">
        <canvas ref="canvas" class="cropper-canvas" />
        <div
          v-for="(rect, index) in rects"
          :key="index"
          class="box"
          :style="{ left: percent(rect.x), top: percent(rect.y), width: percent(rect.w), height: percent(rect.h) }"
          @pointerdown="onDown($event, index, null)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        >
          <span
            v-for="edges in HANDLES"
            :key="edges.join('')"
            class="handle"
            :class="`handle-${edges.join('')}`"
            @pointerdown="onDown($event, index, edges)"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
          />
          <button
            type="button"
            class="box-remove"
            :aria-label="`移除第 ${index + 1} 個框`"
            @pointerdown.stop
            @click="removeRect(index)"
          >
            移除
          </button>
        </div>
      </div>
      <p v-if="failed" class="cropper-status" role="alert">
        這一頁無法顯示。請換一頁，或重新上傳這份樂譜。
      </p>
      <p v-else-if="rendering" class="cropper-status soft">
        讀取頁面中…
      </p>
    </div>
    <button type="button" class="btn cropper-add" @click="addRect">
      加一個框
    </button>
  </div>
</template>

<style scoped>
.cropper {
  position: relative;
  min-height: 0;
  height: 100%;
}

.cropper-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 1rem 1rem 6rem;
  overscroll-behavior: contain;
}

.cropper-sheet {
  position: relative;
  max-width: 64rem;
  margin: 0 auto;
  background: #fff;
}

.cropper-canvas {
  display: block;
  width: 100%;
  height: auto;
}

.cropper-status {
  text-align: center;
  padding: 1rem;
}

.cropper-add {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  background: var(--paper);
  box-shadow: 0 6px 18px -8px rgb(28 43 39 / 60%);
}

.box {
  position: absolute;
  border: 2px solid var(--felt);
  background: color-mix(in srgb, var(--felt) 12%, transparent);
  touch-action: none;
  cursor: move;
}

.box-remove {
  position: absolute;
  top: 0;
  right: 1.75rem;
  transform: translateY(-100%);
  min-height: 2rem;
  padding: 0 0.7em;
  border: 0;
  border-radius: 4px 4px 0 0;
  background: var(--felt);
  color: #fff;
  font-size: var(--step--1);
  font-weight: 600;
  cursor: pointer;
}

/* 把手：看得到的部分小，可以按的範圍大 */
.handle {
  position: absolute;
  width: 2.5rem;
  height: 2.5rem;
  touch-action: none;
}

.handle::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid var(--felt);
  background: #fff;
}

.handle-n,
.handle-s {
  left: 50%;
  margin-left: -1.25rem;
  cursor: ns-resize;
}

.handle-e,
.handle-w {
  top: 50%;
  margin-top: -1.25rem;
  cursor: ew-resize;
}

.handle-n,
.handle-nw,
.handle-ne {
  top: -1.25rem;
}

.handle-s,
.handle-sw,
.handle-se {
  bottom: -1.25rem;
}

.handle-w,
.handle-nw,
.handle-sw {
  left: -1.25rem;
}

.handle-e,
.handle-ne,
.handle-se {
  right: -1.25rem;
}

.handle-nw,
.handle-se {
  cursor: nwse-resize;
}

.handle-ne,
.handle-sw {
  cursor: nesw-resize;
}
</style>
