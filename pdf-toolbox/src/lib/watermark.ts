import { PDFDocument, rgb, degrees } from 'pdf-lib'

export type WatermarkOptions = {
  text: string
  fontSize: number
  color: { r: number; g: number; b: number } // 0-1
  opacity: number    // 0-1
  angle: number      // องศา (บวก = เอียงทวนเข็ม)
  mode: 'center' | 'tile'
  bold: boolean
  pageIndices: number[] | null // index เริ่ม 0 หรือ null = ทุกหน้า
}

async function loadFont(bold: boolean): Promise<ArrayBuffer> {
  const name = bold ? 'Sarabun-Bold.ttf' : 'Sarabun-Regular.ttf'
  const res = await fetch(`/fonts/${name}`)
  if (!res.ok) throw new Error('โหลดฟอนต์ไม่สำเร็จ')
  return res.arrayBuffer()
}

export async function addWatermark(
  file: File,
  opts: WatermarkOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const fontkit = (await import('@pdf-lib/fontkit')).default
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(await loadFont(opts.bold), { subset: true })

  const pages = doc.getPages()
  const targets = new Set(opts.pageIndices ?? pages.map((_, i) => i))

  const textW = font.widthOfTextAtSize(opts.text, opts.fontSize)
  const textH = opts.fontSize
  const rad = (opts.angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  // วาดข้อความหนึ่งก้อนโดยให้กึ่งกลางอยู่ที่ (cx, cy) ในมุมมองที่ผู้ใช้เห็น
  const drawCentered = (
    page: ReturnType<PDFDocument['getPages']>[number],
    cx: number,
    cy: number,
    viewW: number,
    viewH: number
  ) => {
    // จุดวางในมุมมองที่ผู้ใช้เห็น (ยังไม่คิดการหมุนของหน้า)
    const vx = cx - (textW / 2) * cos + (textH / 2) * sin
    const vy = cy - (textW / 2) * sin - (textH / 2) * cos

    const rot = ((page.getRotation().angle % 360) + 360) % 360
    const box = page.getCropBox()
    const { x: boxX, y: boxY, width: boxW, height: boxH } = box

    let x = vx
    let y = vy
    let textAngle = opts.angle
    if (rot === 90) {
      x = boxX + viewH - vy
      y = boxY + vx
      textAngle = opts.angle + 90
    } else if (rot === 180) {
      x = boxX + boxW - vx
      y = boxY + boxH - vy
      textAngle = opts.angle + 180
    } else if (rot === 270) {
      x = boxX + vy
      y = boxY + viewW - vx
      textAngle = opts.angle - 90
    } else {
      x = boxX + vx
      y = boxY + vy
    }

    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color: rgb(opts.color.r, opts.color.g, opts.color.b),
      opacity: opts.opacity,
      rotate: degrees(textAngle),
    })
  }

  pages.forEach((page, i) => {
    if (!targets.has(i)) return

    const rot = ((page.getRotation().angle % 360) + 360) % 360
    const { width: boxW, height: boxH } = page.getCropBox()
    const viewW = rot === 90 || rot === 270 ? boxH : boxW
    const viewH = rot === 90 || rot === 270 ? boxW : boxH

    if (opts.mode === 'center') {
      drawCentered(page, viewW / 2, viewH / 2, viewW, viewH)
      return
    }

    // โหมดปูซ้ำ: วางเป็นตารางเต็มหน้า ระยะห่างตามขนาดข้อความ
    const stepX = textW + opts.fontSize * 3
    const stepY = textH + opts.fontSize * 6
    const cols = Math.ceil(viewW / stepX) + 2
    const rows = Math.ceil(viewH / stepY) + 2
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        // สลับแถวเยื้องครึ่งก้อนให้ดูเป็นลายน้ำมากขึ้น
        const offset = r % 2 === 0 ? 0 : stepX / 2
        drawCentered(page, c * stepX + offset, r * stepY, viewW, viewH)
      }
    }
  })

  return doc.save()
}