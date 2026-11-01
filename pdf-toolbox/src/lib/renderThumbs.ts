import { pdfjsLib } from './pdfjs'

export type RenderedPage = {
  pageIndex: number   // เริ่ม 0
  thumb: string       // data URL ของภาพย่อ
}

export async function renderThumbs(
  file: File,
  onPage: (page: RenderedPage, total: number) => void,
  targetWidth = 160
): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdf = await loadingTask.promise
  const total = pdf.numPages

  try {
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i)

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = targetWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      await page.render({ canvas, viewport }).promise

      onPage({ pageIndex: i - 1, thumb: canvas.toDataURL('image/jpeg', 0.7) }, total)

      page.cleanup()
    }
  } finally {
    await loadingTask.destroy() // คืน memory แม้เกิด error กลางทาง
  }

  return total
}