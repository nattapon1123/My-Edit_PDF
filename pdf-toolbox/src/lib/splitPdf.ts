import { PDFDocument } from 'pdf-lib'

export async function getPageCount(file: File): Promise<number> {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  return doc.getPageCount()
}

// ดึงเฉพาะหน้าที่เลือก ออกมาเป็น PDF ใหม่
export async function extractPages(file: File, pageIndices: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(await file.arrayBuffer())
  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, pageIndices)
  pages.forEach((p) => out.addPage(p))
  return out.save()
}