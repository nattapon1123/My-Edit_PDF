export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export type ProcessOptions = {
  format: OutputFormat
  quality: number          // 0.1 - 1 (ใช้กับ JPG/WebP)
  maxSide: number | null   // ด้านที่ยาวที่สุด (px) หรือ null = ไม่ย่อ
}

export type ProcessedImage = {
  blob: Blob
  width: number
  height: number
}

export const EXTENSIONS: Record<OutputFormat, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function processImage(
  file: File,
  opts: ProcessOptions
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file)
  try {
    // คำนวณขนาดใหม่ (ย่อเท่านั้น ไม่ขยาย)
    let width = bitmap.width
    let height = bitmap.height
    if (opts.maxSide && Math.max(width, height) > opts.maxSide) {
      const ratio = opts.maxSide / Math.max(width, height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // JPG ไม่มีความโปร่งใส เติมพื้นขาวก่อนวาด
    if (opts.format === 'image/jpeg') {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, width, height)
    }

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
        opts.format,
        opts.quality
      )
    )

    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

// เปลี่ยนนามสกุลไฟล์ตามรูปแบบผลลัพธ์ เช่น photo.png -> photo.jpg
export function outputName(original: string, format: OutputFormat): string {
  const base = original.replace(/\.[^.]+$/, '')
  return `${base}.${EXTENSIONS[format]}`
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}