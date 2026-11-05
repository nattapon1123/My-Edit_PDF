import type { Worker as TesseractWorker, LoggerMessage } from 'tesseract.js'
import { pdfjsLib } from './pdfjs'

// ภาษาที่ใช้ (ต้องมีไฟล์ .traineddata.gz ใน public/tesseract/lang/)
export const OCR_LANGS = ['tha', 'eng']

// ความละเอียดตอน render หน้า PDF เป็นรูปเพื่ออ่าน (1 ≈ 72 dpi, 3 ≈ 216 dpi)
const OCR_SCALE = 3
// กันหน้าใหญ่มาก (เช่นโปสเตอร์) ทำให้ canvas ใหญ่เกินที่เบราว์เซอร์รับไหว (พิกเซล)
const MAX_SIDE = 6000
// คุณภาพ JPEG ของรูปหน้าที่จะฝังใน PDF ผลลัพธ์
const JPEG_QUALITY = 0.85

// ที่อยู่ไฟล์ที่เก็บเองใน public/tesseract/
const BASE = '/tesseract'

// ต้องเป็น URL เต็ม เพราะ worker ที่ถูกสร้างจาก blob ไม่รู้จัก path แบบสั้น
const abs = (path: string) => new URL(path, window.location.origin).href

export type OcrProgress = {
  status: string   // ข้อความสถานะจาก Tesseract เช่น 'recognizing text'
  progress: number // 0-1
}

// สร้าง worker ที่ชี้ไปไฟล์ในเครื่องเรา ไม่พึ่ง CDN
// import แบบ dynamic เพื่อให้โค้ด Tesseract ไม่ถูกรวมในหน้าอื่นๆ
export async function createOcrWorker(
  onProgress?: (p: OcrProgress) => void
): Promise<TesseractWorker> {
  const { createWorker } = await import('tesseract.js')

  // เลข 1 = ใช้เอนจิน LSTM อย่างเดียว (ตรงกับไฟล์ core ที่เราก๊อปปี้ไว้)
  return createWorker(OCR_LANGS, 1, {
    workerPath: abs(`${BASE}/worker.min.js`),
    corePath: abs(`${BASE}/core`), // ใส่เป็นโฟลเดอร์ ไม่ใส่ชื่อไฟล์
    langPath: abs(`${BASE}/lang`), // ห้ามมี / ปิดท้าย
    logger: (m: LoggerMessage) =>
      onProgress?.({ status: m.status, progress: m.progress }),
  })
}

// ช่องว่างระหว่างคำที่กว้างกว่า (สัดส่วนนี้ x ความสูงบรรทัด) จะถูกใส่เว้นวรรค
// ไทยใช้เกณฑ์สูงกว่า เพราะตัวอักษรในคำเดียวกันก็ห่างกันได้พอสมควร
// ปรับได้ถ้าผลจริงเว้นวรรคมากหรือน้อยเกินไป
const SPACE_GAP_LATIN = 0.25
const SPACE_GAP_THAI = 0.45
const THAI = /[\u0E00-\u0E7F]/

export type OcrWord = {
  text: string
  x0: number // พิกัดเป็นพิกเซลของรูปที่ส่งเข้ามา (0,0 = มุมบนซ้าย)
  y0: number
  x1: number
  y1: number
  confidence: number // 0-100
}

export type OcrLine = {
  text: string // ข้อความทั้งบรรทัด ประกอบจากตำแหน่งจริง
  x0: number
  y0: number
  x1: number
  y1: number
  confidence: number
}

export type OcrPage = {
  width: number  // ขนาดรูปที่ใช้อ่าน (พิกเซล)
  height: number
  text: string   // ข้อความทั้งหน้า (คั่นบรรทัดด้วย \n)
  lines: OcrLine[]
  words: OcrWord[] // เก็บไว้ใช้ดีบัก
}

// อ่านข้อความจากรูปหนึ่งหน้า คืนข้อความรายบรรทัดพร้อมตำแหน่ง
export async function recognizeCanvas(
  worker: TesseractWorker,
  canvas: HTMLCanvasElement
): Promise<OcrPage> {
  // blocks: true จำเป็น ไม่งั้นจะไม่ได้ตำแหน่งของคำ
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })

  const words: OcrWord[] = []
  const lines: OcrLine[] = []

  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        const lineHeight = line.bbox.y1 - line.bbox.y0
        let lineText = ''
        let right = -Infinity // ขอบขวาสุดของสิ่งที่ต่อแล้วในบรรทัดนี้

        for (const w of line.words) {
          const text = w.text.trim()
          if (!text) continue

          words.push({
            text,
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
            confidence: w.confidence,
          })

          // ช่องว่างกว้างพอ = คนละคำ ถ้ามีอักษรไทยอยู่ฝั่งใดฝั่งหนึ่งใช้เกณฑ์ที่สูงกว่า
          if (lineText) {
            const thai = THAI.test(lineText.slice(-1)) || THAI.test(text[0])
            const limit = lineHeight * (thai ? SPACE_GAP_THAI : SPACE_GAP_LATIN)
            if (w.bbox.x0 - right > limit) lineText += ' '
          }
          lineText += text
          right = Math.max(right, w.bbox.x1)
        }

        if (!lineText) continue
        lines.push({
          text: lineText,
          x0: line.bbox.x0,
          y0: line.bbox.y0,
          x1: line.bbox.x1,
          y1: line.bbox.y1,
          confidence: line.confidence,
        })
      }
    }
  }

  return {
    width: canvas.width,
    height: canvas.height,
    text: lines.map((l) => l.text).join('\n'),
    lines,
    words,
  }
}

export type OcrPageResult = {
  pageIndex: number // เริ่ม 0
  total: number
  ocr: OcrPage
  jpeg: Uint8Array // รูปหน้านี้ (ตามที่ผู้ใช้เห็น รวมการหมุนแล้ว)
  widthPt: number  // ขนาดหน้าเป็นหน่วย pt (ตอน scale 1) สำหรับสร้างหน้าใน PDF ใหม่
  heightPt: number
}

// อ่านทีละหน้า: render เป็นรูป -> OCR -> ส่งผลให้ onPage แล้วค่อยไปหน้าถัดไป
// ส่ง signal มาเพื่อยกเลิกกลางทางได้ (จะหยุดก่อนเริ่มหน้าถัดไป)
export async function ocrPdfPages(
  file: File,
  worker: TesseractWorker,
  onPage: (result: OcrPageResult) => void | Promise<void>,
  signal?: AbortSignal
): Promise<number> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const total = pdf.numPages

    for (let i = 1; i <= total; i++) {
      if (signal?.aborted) throw new DOMException('ยกเลิกแล้ว', 'AbortError')

      const page = await pdf.getPage(i) // pdf.js นับจาก 1
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(OCR_SCALE, MAX_SIDE / Math.max(base.width, base.height))
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      // เติมพื้นขาว กันพื้นดำเวลาหน้าไม่มีพื้นหลัง (OCR อ่านพื้นดำไม่ดี)
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      await page.render({ canvas, viewport }).promise

      const ocr = await recognizeCanvas(worker, canvas)

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
          'image/jpeg',
          JPEG_QUALITY
        )
      )
      const jpeg = new Uint8Array(await blob.arrayBuffer())

      // คืน memory
      canvas.width = 0
      canvas.height = 0
      page.cleanup()

      await onPage({
        pageIndex: i - 1,
        total,
        ocr,
        jpeg,
        widthPt: base.width,
        heightPt: base.height,
      })
    }

    return total
  } finally {
    await loadingTask.destroy() // คืน memory แม้เกิด error กลางทาง
  }
}