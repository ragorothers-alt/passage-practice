/**
 * 把上傳的 PDF 或圖片統一成「可以依頁數畫出來」的來源，
 * 框選與裁切都只面對這個介面。
 */
import type { CropRect } from '@/domain/types'

export interface LoadedPages {
  pageCount: number
  /** 把某一頁畫成指定寬度（像素）的畫布 */
  render: (page: number, width: number) => Promise<HTMLCanvasElement>
  close: () => void
}

/** 裁切時整頁的最大寬度，夠在平板上放大看又不會佔太多空間 */
const CROP_PAGE_WIDTH = 2400

export function kindOf(file: File): 'pdf' | 'image' | null {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('image/')) return 'image'
  return null
}

async function loadPdf(blob: Blob): Promise<LoadedPages> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const task = pdfjs.getDocument({ data: await blob.arrayBuffer() })
  const doc = await task.promise

  return {
    pageCount: doc.numPages,
    async render(pageNo, width) {
      const page = await doc.getPage(pageNo)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: width / base.width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvas, viewport }).promise
      return canvas
    },
    close() {
      void task.destroy()
    },
  }
}

async function loadImage(blob: Blob): Promise<LoadedPages> {
  const bitmap = await createImageBitmap(blob)
  return {
    pageCount: 1,
    async render(_page, width) {
      const w = Math.min(Math.round(width), bitmap.width)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = Math.round((bitmap.height * w) / bitmap.width)
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      return canvas
    },
    close() {
      bitmap.close()
    },
  }
}

export function loadPages(kind: 'pdf' | 'image', blob: Blob): Promise<LoadedPages> {
  return kind === 'pdf' ? loadPdf(blob) : loadImage(blob)
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('無法把框選範圍存成圖片'))),
      'image/webp',
      0.92,
    )
  })
}

/** 依框選範圍把一頁裁成數張圖片 */
export async function cropPage(pages: LoadedPages, page: number, rects: CropRect[]): Promise<Blob[]> {
  const full = await pages.render(page, CROP_PAGE_WIDTH)
  const out: Blob[] = []
  for (const r of rects) {
    const sx = Math.round(r.x * full.width)
    const sy = Math.round(r.y * full.height)
    const sw = Math.max(1, Math.round(r.w * full.width))
    const sh = Math.max(1, Math.round(r.h * full.height))
    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')!
    // PDF 的透明背景要補成白色，否則存成圖片後會變黑
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, sw, sh)
    ctx.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh)
    out.push(await toBlob(canvas))
  }
  return out
}
