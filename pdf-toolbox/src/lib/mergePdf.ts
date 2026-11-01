import { PDFDocument, degrees } from 'pdf-lib'
import type { PageItem } from './types'

export async function mergePages(
  pages: PageItem[],
  files: Map<string, File>
): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  // โหลดต้นฉบับแต่ละไฟล์เพียงครั้งเดียว เก็บไว้ใน cache
  const sources = new Map<string, PDFDocument>()

  for (const item of pages) {
    let src = sources.get(item.fileId)
    if (!src) {
      const file = files.get(item.fileId)
      if (!file) throw new Error(`ไม่พบไฟล์ต้นฉบับ: ${item.fileName}`)
      src = await PDFDocument.load(await file.arrayBuffer())
      sources.set(item.fileId, src)
    }

    const [copied] = await merged.copyPages(src, [item.pageIndex])

    if (item.rotation !== 0) {
      const current = copied.getRotation().angle
      copied.setRotation(degrees((current + item.rotation) % 360))
    }

    merged.addPage(copied)
  }

  return merged.save()
}