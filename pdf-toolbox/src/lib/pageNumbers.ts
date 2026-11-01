import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

export type HPos = 'left' | 'center' | 'right'
export type VPos = 'top' | 'bottom'
export type NumberFormat = 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total'

export type PageNumberOptions = {
  hPos: HPos
  vPos: VPos
  format: NumberFormat
  startNumber: number // เลขที่จะใส่ในหน้าแรกที่เริ่มใส่
  fromPage: number    // เริ่มใส่ตั้งแต่หน้าที่ (นับจาก 1)
  fontSize: number
  margin: number      // ระยะจากขอบ (หน่วย pt)
}

function buildText(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case 'n':
      return `${n}`
    case 'page-n':
      return `Page ${n}`
    case 'n-of-total':
      return `${n} / ${total}`
    case 'page-n-of-total':
      return `Page ${n} of ${total}`
  }
}

export async function addPageNumbers(
  file: File,
  opts: PageNumberOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  // เลขรวมที่แสดงใน "n / total" = จำนวนหน้าที่ถูกใส่เลขจริง + เลขเริ่มต้น - 1
  const numbered = pages.length - (opts.fromPage - 1)
  const lastNumber = opts.startNumber + numbered - 1

  pages.forEach((page, i) => {
    if (i < opts.fromPage - 1) return

    const n = opts.startNumber + (i - (opts.fromPage - 1))
    const text = buildText(opts.format, n, lastNumber)
    const textWidth = font.widthOfTextAtSize(text, opts.fontSize)

    // ขนาดหน้าที่ผู้ใช้เห็นจริงหลังหมุนแล้ว
    const rot = ((page.getRotation().angle % 360) + 360) % 360
    const { width: w, height: h } = page.getSize()
    const viewW = rot === 90 || rot === 270 ? h : w
    const viewH = rot === 90 || rot === 270 ? w : h

    // ตำแหน่งบนหน้าที่ผู้ใช้เห็น (จุด 0,0 อยู่มุมล่างซ้ายของมุมมอง)
    let vx: number
    if (opts.hPos === 'left') vx = opts.margin
    else if (opts.hPos === 'center') vx = (viewW - textWidth) / 2
    else vx = viewW - opts.margin - textWidth

    const vy =
      opts.vPos === 'bottom'
        ? opts.margin
        : viewH - opts.margin - opts.fontSize

    // แปลงพิกัดมุมมองกลับเป็นพิกัดหน้าจริงของ PDF พร้อมมุมหมุนของข้อความ
    let x = vx
    let y = vy
    let textRotate = 0
    if (rot === 90) {
      x = vy
      y = viewW - vx
      textRotate = -90
    } else if (rot === 180) {
      x = w - vx
      y = h - vy
      textRotate = 180
    } else if (rot === 270) {
      x = viewH - vy
      y = vx
      textRotate = 90
    }

    page.drawText(text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(0, 0, 0),
      rotate: degrees(textRotate),
    })
  })

  return doc.save()
}