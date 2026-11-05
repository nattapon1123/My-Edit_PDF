import { PDFDocument, rgb } from 'pdf-lib'
import type { OcrPageResult } from './ocrPdf'

// ฟอนต์ที่รองรับไทย (ใช้ตัวเดียวกับ watermark.ts)
const FONT_URL = '/fonts/Sarabun-Regular.ttf'

async function loadFont(): Promise<ArrayBuffer> {
  const res = await fetch(FONT_URL)
  if (!res.ok) throw new Error('โหลดฟอนต์ไม่สำเร็จ')
  return res.arrayBuffer()
}

export type SearchablePdfBuilder = {
  addPage: (result: OcrPageResult) => Promise<void>
  save: () => Promise<Uint8Array>
}

// สร้างตัวประกอบ PDF: เรียก addPage ทีละหน้า แล้วเรียก save ตอนจบ
export async function createSearchablePdfBuilder(): Promise<SearchablePdfBuilder> {
  const doc = await PDFDocument.create()
  const fontkit = (await import('@pdf-lib/fontkit')).default
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await loadFont(), { subset: true })

  const addPage = async (r: OcrPageResult) => {
    // หน้าใหม่ขนาดเท่าหน้าที่ผู้ใช้เห็น (รวมการหมุนแล้ว) แล้ววางรูปเต็มหน้า
    const page = doc.addPage([r.widthPt, r.heightPt])
    const image = await doc.embedJpg(r.jpeg)
    page.drawImage(image, { x: 0, y: 0, width: r.widthPt, height: r.heightPt })

    // แปลงพิกเซลของรูป เป็นหน่วย pt ของหน้า
    const sx = r.widthPt / r.ocr.width
    const sy = r.heightPt / r.ocr.height

    for (const line of r.ocr.lines) {
      try {
        const lineW = (line.x1 - line.x0) * sx
        const lineH = (line.y1 - line.y0) * sy
        if (lineW <= 0 || lineH <= 0) continue

        // ปรับขนาดตัวอักษรให้ข้อความกว้างเท่าบรรทัดจริง (ไว้ให้ไฮไลต์ตรงกับตัวหนังสือ)
        const probe = lineH * 0.75
        const natural = font.widthOfTextAtSize(line.text, probe)
        if (!natural) continue
        const size = Math.max(2, Math.min(probe * (lineW / natural), lineH * 1.2))

        page.drawText(line.text, {
          x: line.x0 * sx,
          // PDF นับ y จากล่างขึ้นบน ขณะที่รูปนับจากบนลงล่าง
          y: r.heightPt - line.y1 * sy + lineH * 0.2,
          size,
          font,
          color: rgb(0, 0, 0),
          opacity: 0, // ล่องหน แต่ยังเลือก/ค้นหาได้
        })
      } catch (e) {
        // บรรทัดที่มีอักขระฟอนต์ไม่รองรับ ข้ามไปเฉยๆ ไม่ให้ทั้งไฟล์พัง
        console.warn('ข้ามบรรทัดที่วางข้อความไม่ได้', line.text, e)
      }
    }
  }

  return { addPage, save: () => doc.save() }
}