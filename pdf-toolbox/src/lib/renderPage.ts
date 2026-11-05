import { pdfjsLib } from './pdfjs'

// วาดหน้าเดียวเป็นภาพ (data URL) ตามมุมมองที่ผู้ใช้เห็นจริง รวมการหมุนของหน้าแล้ว
export async function renderPagePreview(
  file: File,
  pageIndex = 0,
  targetWidth = 600
): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageIndex + 1) // pdf.js นับจาก 1
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: targetWidth / base.width })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    // เติมพื้นขาว กันพื้นดำเวลาหน้าไม่มีพื้นหลัง
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvas, viewport }).promise
    const url = canvas.toDataURL('image/jpeg', 0.85)

    canvas.width = 0
    canvas.height = 0
    page.cleanup()
    return url
  } finally {
    await loadingTask.destroy()
  }
}

// วาดหน้าสำหรับหน้าแก้ไข: คืนรูป พร้อมขนาดหน้าเป็น pt ของมุมมองที่ผู้ใช้เห็น (รวมการหมุนแล้ว)
export async function renderPageForEdit(
  file: File,
  pageIndex: number,
  targetWidth = 900
): Promise<{ url: string; widthPt: number; heightPt: number }> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(pageIndex + 1) // pdf.js นับจาก 1
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: targetWidth / base.width })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvas, viewport }).promise
    const url = canvas.toDataURL('image/jpeg', 0.85)

    canvas.width = 0
    canvas.height = 0
    page.cleanup()
    return { url, widthPt: base.width, heightPt: base.height }
  } finally {
    await loadingTask.destroy()
  }
}