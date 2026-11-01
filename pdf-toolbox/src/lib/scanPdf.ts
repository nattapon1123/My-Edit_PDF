import { PDFDocument } from 'pdf-lib'

export type ScanMode = 'original' | 'gray' | 'bw'
export type PageSize = 'image' | 'a4'

export type ScanOptions = {
  mode: ScanMode
  brightness: number // -100 ถึง 100
  contrast: number   // -100 ถึง 100
  pageSize: PageSize
}

export type ScanImage = {
  file: File
  rotation: 0 | 90 | 180 | 270
}

const MAX_SIDE = 2000
const A4_W = 595.28
const A4_H = 841.89

// ย่อรูป + ใส่ฟิลเตอร์ + หมุน แล้วคืนเป็น JPEG bytes พร้อมขนาดผลลัพธ์
export async function processScan(
  img: ScanImage,
  opts: ScanOptions
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  // imageOrientation: 'from-image' ให้รูปจากมือถือที่มี EXIF หมุนแสดงถูกทิศ
  const bitmap = await createImageBitmap(img.file, { imageOrientation: 'from-image' })
  try {
    const ratio = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * ratio)
    const h = Math.round(bitmap.height * ratio)

    const swap = img.rotation === 90 || img.rotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? h : w
    canvas.height = swap ? w : h
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // หมุนรอบจุดกึ่งกลางแล้ววาด
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((img.rotation * Math.PI) / 180)
    ctx.drawImage(bitmap, -w / 2, -h / 2, w, h)
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    if (opts.mode !== 'original' || opts.brightness !== 0 || opts.contrast !== 0) {
      applyFilter(ctx, canvas.width, canvas.height, opts)
    }

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
        'image/jpeg',
        0.85
      )
    )
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const result = { bytes, width: canvas.width, height: canvas.height }

    canvas.width = 0
    canvas.height = 0
    return result
  } finally {
    bitmap.close()
  }
}

function applyFilter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: ScanOptions
) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data

  // สูตรคอนทราสต์มาตรฐาน: factor = 259(c+255) / (255(259-c))
  const c = opts.contrast * 2.55
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  const b = opts.brightness * 2.55

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]
    let g = d[i + 1]
    let bl = d[i + 2]

    if (opts.mode !== 'original') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * bl
      r = g = bl = gray
    }

    r = factor * (r - 128) + 128 + b
    g = factor * (g - 128) + 128 + b
    bl = factor * (bl - 128) + 128 + b

    if (opts.mode === 'bw') {
      const v = (r + g + bl) / 3 > 128 ? 255 : 0
      r = g = bl = v
    }

    d[i] = Math.max(0, Math.min(255, r))
    d[i + 1] = Math.max(0, Math.min(255, g))
    d[i + 2] = Math.max(0, Math.min(255, bl))
  }

  ctx.putImageData(imageData, 0, 0)
}

// รวมรูปทั้งหมดเป็น PDF ไฟล์เดียว
export async function buildScanPdf(
  images: ScanImage[],
  opts: ScanOptions,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (let i = 0; i < images.length; i++) {
    const { bytes, width, height } = await processScan(images[i], opts)
    const jpg = await doc.embedJpg(bytes)

    if (opts.pageSize === 'a4') {
      // หน้า A4 (แนวตั้งหรือนอนตามรูป) วางรูปกึ่งกลางโดยรักษาสัดส่วน
      const landscape = width > height
      const pw = landscape ? A4_H : A4_W
      const ph = landscape ? A4_W : A4_H
      const scale = Math.min(pw / width, ph / height)
      const dw = width * scale
      const dh = height * scale
      const page = doc.addPage([pw, ph])
      page.drawImage(jpg, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh })
    } else {
      const page = doc.addPage([width, height])
      page.drawImage(jpg, { x: 0, y: 0, width, height })
    }

    onProgress?.(i + 1, images.length)
  }

  return doc.save()
}