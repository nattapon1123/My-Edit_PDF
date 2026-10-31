import { PDFDocument, degrees } from 'pdf-lib'

// หมุนเฉพาะหน้าที่ระบุ (หรือทุกหน้าถ้า pageIndices เป็น null)
export async function rotatePages(
  file: File,
  angle: 90 | 180 | 270,
  pageIndices: number[] | null
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const pages = doc.getPages()
  const targets = pageIndices ?? pages.map((_, i) => i)

  for (const i of targets) {
    const page = pages[i]
    const current = page.getRotation().angle
    page.setRotation(degrees((current + angle) % 360))
  }

  return doc.save()
}