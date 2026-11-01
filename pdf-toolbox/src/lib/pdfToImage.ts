import { pdfjsLib } from './pdfjs'

export type ImageFormat = 'image/jpeg' | 'image/png'

export type RenderedImage = {
  pageIndex: number // เริ่ม 0
  blob: Blob
  width: number
  height: number
}

export async function getPdfPageCount(file: File): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })
  try {
    const pdf = await loadingTask.promise
    return pdf.numPages
  } finally {
    await loadingTask.destroy()
  }
}

/**
 * Render หน้าที่เลือกเป็นรูปทีละหน้า
 * pageIndices = รายการ index เริ่ม 0 (ได้จาก parsePageRange) หรือ null = ทุกหน้า
 * เรียก onImage ทุกครั้งที่เสร็จ 1 หน้า
 */
export async function renderPdfToImages(
  file: File,
  opts: { format: ImageFormat; scale: number; quality: number; pageIndices: number[] | null },
  onImage: (img: RenderedImage, done: number, total: number) => void
): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const targets = opts.pageIndices ?? Array.from({ length: pdf.numPages }, (_, i) => i)

    for (let n = 0; n < targets.length; n++) {
      const pageIndex = targets[n]
      const page = await pdf.getPage(pageIndex + 1) // pdf.js นับจาก 1
      const viewport = page.getViewport({ scale: opts.scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      // JPG ไม่มีความโปร่งใส เติมพื้นขาวก่อน
      if (opts.format === 'image/jpeg') {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      await page.render({ canvas, viewport }).promise

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
          opts.format,
          opts.quality
        )
      )

      onImage({ pageIndex, blob, width: canvas.width, height: canvas.height }, n + 1, targets.length)

      // คืน memory
      canvas.width = 0
      canvas.height = 0
      page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }
}