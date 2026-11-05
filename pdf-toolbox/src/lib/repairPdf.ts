import { PDFDocument } from 'pdf-lib'
import { pdfjsLib } from './pdfjs'

export type RepairLevel = 'rebuild' | 'rasterize'

export type RepairResult = {
  bytes: Uint8Array
  level: RepairLevel
  pageCount: number
  skippedPages: number[] // เลขหน้า (เริ่ม 1) ที่ render ไม่ได้ในระดับ 2
}

// ระดับ 1: โหลดด้วย pdf-lib แล้วบันทึกใหม่ ได้โครงสร้างสะอาด ข้อความยังเลือกได้
async function rebuild(file: File): Promise<RepairResult> {
  const src = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: false,
    throwOnInvalidObject: false,
    updateMetadata: false,
  })

  // คัดลอกหน้าไปเอกสารใหม่ เพื่อทิ้งโครงสร้างเก่าที่อาจเสียทิ้งไป
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, src.getPageIndices())
  pages.forEach((p) => out.addPage(p))

  if (out.getPageCount() === 0) throw new Error('ไม่พบหน้าในไฟล์')

  return {
    bytes: await out.save(),
    level: 'rebuild',
    pageCount: out.getPageCount(),
    skippedPages: [],
  }
}

// ระดับ 2: render ทีละหน้าด้วย pdfjs แล้วสร้าง PDF ใหม่จากรูป ข้อความจะกลายเป็นรูป
async function rasterize(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<RepairResult> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const total = pdf.numPages
    const out = await PDFDocument.create()
    const skipped: number[] = []

    for (let i = 1; i <= total; i++) {
      try {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({ canvas, viewport }).promise

        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
            'image/jpeg',
            0.9
          )
        )
        const jpg = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()))

        // ขนาดหน้าเดิมที่ scale 1 (หน่วย pt)
        const base = page.getViewport({ scale: 1 })
        const outPage = out.addPage([base.width, base.height])
        outPage.drawImage(jpg, { x: 0, y: 0, width: base.width, height: base.height })

        canvas.width = 0
        canvas.height = 0
        page.cleanup()
      } catch (e) {
        console.error(`render หน้า ${i} ไม่ได้`, e)
        skipped.push(i)
      }
      onProgress?.(i, total)
    }

    if (out.getPageCount() === 0) throw new Error('กู้ไม่ได้เลยสักหน้า')

    return {
      bytes: await out.save(),
      level: 'rasterize',
      pageCount: out.getPageCount(),
      skippedPages: skipped,
    }
  } finally {
    await loadingTask.destroy()
  }
}

// เรียกอันนี้จาก UI: ลองระดับ 1 ก่อน ถ้าพังค่อยลงระดับ 2
export async function repairPdf(
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<RepairResult> {
  try {
    return await rebuild(file)
  } catch (e) {
    console.warn('ซ่อมระดับ 1 ไม่สำเร็จ ลงระดับ 2', e)
    return await rasterize(file, onProgress)
  }
}