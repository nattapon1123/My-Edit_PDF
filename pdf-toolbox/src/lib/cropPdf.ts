import { PDFDocument } from 'pdf-lib'

// ระยะตัดเป็นเปอร์เซ็นต์ของหน้าที่ผู้ใช้เห็น (0-100)
export type CropMargins = {
  top: number
  bottom: number
  left: number
  right: number
}

export async function cropPdf(
  file: File,
  margins: CropMargins,
  pageIndices: number[] | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const pages = doc.getPages()
  const targets = new Set(pageIndices ?? pages.map((_, i) => i))

  pages.forEach((page, i) => {
    if (!targets.has(i)) return

    // ใช้กรอบที่แสดงอยู่ปัจจุบัน (CropBox ถ้ามี ไม่งั้น MediaBox)
    const box = page.getCropBox()
    const rot = ((page.getRotation().angle % 360) + 360) % 360

    // ระยะตัดแต่ละด้านในมุมมองที่ผู้ใช้เห็น แล้วแปลงเป็นด้านจริงของหน้า
    // m = [บน, ล่าง, ซ้าย, ขวา] ในมุมมองที่เห็น
    let realTop: number, realBottom: number, realLeft: number, realRight: number
    if (rot === 90) {
      // ด้านบนที่เห็น = ด้านซ้ายจริง, ซ้ายที่เห็น = ด้านล่างจริง
      realLeft = margins.top
      realRight = margins.bottom
      realBottom = margins.left
      realTop = margins.right
    } else if (rot === 180) {
      realBottom = margins.top
      realTop = margins.bottom
      realRight = margins.left
      realLeft = margins.right
    } else if (rot === 270) {
      realRight = margins.top
      realLeft = margins.bottom
      realTop = margins.left
      realBottom = margins.right
    } else {
      realTop = margins.top
      realBottom = margins.bottom
      realLeft = margins.left
      realRight = margins.right
    }

    const x = box.x + (box.width * realLeft) / 100
    const y = box.y + (box.height * realBottom) / 100
    const width = box.width * (1 - (realLeft + realRight) / 100)
    const height = box.height * (1 - (realTop + realBottom) / 100)

    page.setCropBox(x, y, width, height)
  })

  return doc.save()
}