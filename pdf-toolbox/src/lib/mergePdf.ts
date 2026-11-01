import { PDFDocument, degrees } from 'pdf-lib'
import type { PageItem } from './types'

// แปลงรูปชนิดอื่น (เช่น WebP) เป็น PNG ผ่าน canvas เพราะ pdf-lib ฝังได้แค่ JPG/PNG
async function toPngBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))), 'image/png')
    )
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    bitmap.close()
  }
}

export async function mergePages(
  pages: PageItem[],
  files: Map<string, File>
): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  const sources = new Map<string, PDFDocument>()

  for (const item of pages) {
    const file = files.get(item.fileId)
    if (!file) throw new Error(`ไม่พบไฟล์ต้นฉบับ: ${item.fileName}`)

    let page

    if (item.kind === 'pdf') {
      let src = sources.get(item.fileId)
      if (!src) {
        src = await PDFDocument.load(await file.arrayBuffer())
        sources.set(item.fileId, src)
      }
      const [copied] = await merged.copyPages(src, [item.pageIndex])
      page = merged.addPage(copied)
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const image =
        file.type === 'image/jpeg'
          ? await merged.embedJpg(bytes)
          : file.type === 'image/png'
            ? await merged.embedPng(bytes)
            : await merged.embedPng(await toPngBytes(file))

      page = merged.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
    }

    if (item.rotation !== 0) {
      const current = page.getRotation().angle
      page.setRotation(degrees((current + item.rotation) % 360))
    }
  }

  return merged.save()
}