import { PDFDocument, rgb, degrees, type PDFFont } from 'pdf-lib'

export type EditColor = { r: number; g: number; b: number } // 0-1

// พิกัดทุกอย่างเป็นหน่วย pt ของ "หน้าที่ผู้ใช้เห็น" โดย (0,0) = มุมบนซ้าย
export type TextEdit = {
  id: string
  kind: 'text'
  pageIndex: number // เริ่ม 0
  x: number         // pt จากขอบซ้าย
  y: number         // pt จากขอบบน (มุมบนซ้ายของกล่องข้อความ)
  text: string      // ขึ้นบรรทัดใหม่ได้ด้วย \n
  fontSize: number  // pt
  color: EditColor
  bold: boolean
}

export type ImageEdit = {
  id: string
  kind: 'image'
  pageIndex: number
  x: number         // pt มุมบนซ้ายของรูป
  y: number
  width: number     // pt
  height: number    // pt
  bytes: Uint8Array
  mime: 'image/jpeg' | 'image/png'
}

export type EditItem = TextEdit | ImageEdit

// ค่าที่น่าจะต้องปรับตามผลทดสอบจริง
export const LINE_HEIGHT = 1.2 // ระยะห่างบรรทัด (เท่าของขนาดตัวอักษร) ใช้ร่วมกับหน้าตัวอย่าง
const BASELINE_RATIO = 0.85    // เส้นฐานตัวอักษรอยู่ลึกจากขอบบนกล่องกี่เท่าของขนาดตัวอักษร
const JPEG_QUALITY = 0.92      // คุณภาพตอนแปลงรูป JPEG ใหม่

async function loadFont(bold: boolean): Promise<ArrayBuffer> {
  const name = bold ? 'Sarabun-Bold.ttf' : 'Sarabun-Regular.ttf'
  const res = await fetch(`/fonts/${name}`)
  if (!res.ok) throw new Error('โหลดฟอนต์ไม่สำเร็จ')
  return res.arrayBuffer()
}

export type PreparedImage = {
  bytes: Uint8Array
  mime: ImageEdit['mime']
  width: number  // ขนาดจริงเป็นพิกเซล ใช้คำนวณสัดส่วน
  height: number
}

// เตรียมรูปให้พร้อมฝัง: pdf-lib ฝังได้แค่ JPG/PNG
// - PNG ใช้ไฟล์เดิม (รักษาความโปร่งใส)
// - JPEG วาดใหม่ผ่าน canvas เพื่อให้ทิศทางตาม EXIF ถูกต้อง (รูปจากมือถือมักมี EXIF หมุน)
// - WebP แปลงเป็น PNG
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    if (file.type === 'image/png') {
      return {
        bytes: new Uint8Array(await file.arrayBuffer()),
        mime: 'image/png',
        width: bitmap.width,
        height: bitmap.height,
      }
    }

    const mime: ImageEdit['mime'] = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
        mime,
        JPEG_QUALITY
      )
    )
    const result = {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mime,
      width: canvas.width,
      height: canvas.height,
    }
    canvas.width = 0
    canvas.height = 0
    return result
  } finally {
    bitmap.close()
  }
}

type Box = { x: number; y: number; width: number; height: number }

// แปลงจุดบนหน้าที่ผู้ใช้เห็น (px, py = pt จากมุมบนซ้าย) เป็นพิกัดจริงของ PDF
// พร้อมมุมหมุนที่ต้องใช้ ให้เนื้อหาตั้งตรงในมุมมองที่เห็น
function viewToReal(box: Box, rot: number, px: number, py: number) {
  const viewW = rot === 90 || rot === 270 ? box.height : box.width
  const viewH = rot === 90 || rot === 270 ? box.width : box.height

  if (rot === 90) return { x: box.x + py, y: box.y + px, angle: 90 }
  if (rot === 180) return { x: box.x + box.width - px, y: box.y + py, angle: 180 }
  if (rot === 270) return { x: box.x + viewH - py, y: box.y + viewW - px, angle: 270 }
  return { x: box.x + px, y: box.y + viewH - py, angle: 0 }
}

export async function applyEdits(file: File, items: EditItem[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const pages = doc.getPages()

  if (items.some((i) => i.kind === 'text' && i.text.trim())) {
    const fontkit = (await import('@pdf-lib/fontkit')).default
    doc.registerFontkit(fontkit)
  }

  // โหลดฟอนต์เมื่อใช้จริง และใช้ซ้ำ
  let regular: PDFFont | null = null
  let bold: PDFFont | null = null
  const getFont = async (isBold: boolean): Promise<PDFFont> => {
    if (isBold) {
      bold ??= await doc.embedFont(await loadFont(true), { subset: true })
      return bold
    }
    regular ??= await doc.embedFont(await loadFont(false), { subset: true })
    return regular
  }

  for (const item of items) {
    const page = pages[item.pageIndex]
    if (!page) continue

    // ใช้กรอบที่แสดงอยู่ (CropBox ถ้ามี ไม่งั้น MediaBox) เหมือน cropPdf.ts
    const box = page.getCropBox()
    const rot = ((page.getRotation().angle % 360) + 360) % 360

    if (item.kind === 'image') {
      const image =
        item.mime === 'image/jpeg'
          ? await doc.embedJpg(item.bytes)
          : await doc.embedPng(item.bytes)

      // drawImage วางจากมุมล่างซ้ายของรูป จึงแปลงจุดมุมล่างซ้ายในมุมมองที่เห็น
      const { x, y, angle } = viewToReal(box, rot, item.x, item.y + item.height)
      page.drawImage(image, {
        x,
        y,
        width: item.width,
        height: item.height,
        rotate: degrees(angle),
      })
      continue
    }

    if (!item.text.trim()) continue
    const font = await getFont(item.bold)

    try {
      item.text.split(/\r?\n/).forEach((line, i) => {
        if (!line.trim()) return
        const py = item.y + item.fontSize * (BASELINE_RATIO + i * LINE_HEIGHT)
        const { x, y, angle } = viewToReal(box, rot, item.x, py)
        page.drawText(line, {
          x,
          y,
          size: item.fontSize,
          font,
          color: rgb(item.color.r, item.color.g, item.color.b),
          rotate: degrees(angle),
        })
      })
    } catch (e) {
      console.error(e)
      throw new Error(
        `วางข้อความไม่สำเร็จ "${item.text.slice(0, 20)}" อาจมีตัวอักษรที่ฟอนต์ไม่รองรับ`
      )
    }
  }

  return doc.save()
}