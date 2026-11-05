import { useEffect, useRef, useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { createOcrWorker, ocrPdfPages } from '../lib/ocrPdf'
import { createSearchablePdfBuilder } from '../lib/searchablePdf'
import { getPageCount } from '../lib/splitPdf'
import { formatSize } from '../lib/imageProcess'
import { downloadBytes, downloadBlob } from '../lib/download'

type Result = {
  bytes: Uint8Array
  text: string
  pageCount: number
  seconds: number
}

export default function OcrPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [stage, setStage] = useState('')
  const [done, setDone] = useState(0)
  const [pageProgress, setPageProgress] = useState(0) // 0-1 ของหน้าที่กำลังอ่าน
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  // ออกจากหน้านี้ระหว่างทำงาน ให้หยุดงานด้วย
  useEffect(() => () => abortRef.current?.abort(), [])

  const onFiles = async (files: File[]) => {
    const pdf = files.find(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (!pdf) {
      setError('รองรับเฉพาะไฟล์ PDF')
      return
    }
    setError('')
    try {
      setTotal(await getPageCount(pdf))
      setFile(pdf)
      setResult(null)
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleRun = async () => {
    if (!file) return
    setBusy(true)
    setCancelling(false)
    setError('')
    setResult(null)
    setDone(0)
    setPageProgress(0)
    setStage('กำลังโหลดโมเดลภาษา (ครั้งแรกอาจใช้เวลาสักครู่)...')

    const ctrl = new AbortController()
    abortRef.current = ctrl
    const t0 = performance.now()
    let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null

    try {
      worker = await createOcrWorker((p) => {
        if (p.status === 'recognizing text') setPageProgress(p.progress)
      })
      const builder = await createSearchablePdfBuilder()
      const texts: string[] = []

      setStage(`กำลังอ่านหน้า 1/${total}`)
      const pageCount = await ocrPdfPages(
        file,
        worker,
        async (r) => {
          await builder.addPage(r)
          texts.push(`--- หน้า ${r.pageIndex + 1} ---\n${r.ocr.text}`)
          setDone(r.pageIndex + 1)
          setPageProgress(0)
          if (r.pageIndex + 1 < r.total) {
            setStage(`กำลังอ่านหน้า ${r.pageIndex + 2}/${r.total}`)
          } else {
            setStage('กำลังสร้างไฟล์ PDF...')
          }
        },
        ctrl.signal
      )

      const bytes = await builder.save()
      setResult({
        bytes,
        text: texts.join('\n\n'),
        pageCount,
        seconds: (performance.now() - t0) / 1000,
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('ยกเลิกแล้ว')
      } else {
        console.error(e)
        setError('ทำ OCR ไม่สำเร็จ ไฟล์อาจเสีย มีรหัสผ่าน หรือหน่วยความจำไม่พอ ลองไฟล์ที่มีจำนวนหน้าน้อยลง')
      }
    } finally {
      await worker?.terminate()
      setBusy(false)
      setCancelling(false)
      setStage('')
      setPageProgress(0)
    }
  }

  const handleCancel = () => {
    setCancelling(true)
    abortRef.current?.abort()
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : 'ocr'

  const percent =
    total > 0 ? Math.min(100, Math.round(((done + pageProgress) / total) * 100)) : 0

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">OCR PDF</h1>
      <p className="text-sm text-gray-600">
        แปลงไฟล์สแกนเป็น PDF ที่ค้นหาและคัดลอกข้อความได้ ภาพหน้าตาเหมือนเดิม
        ประมวลผลในเบราว์เซอร์ ไฟล์ไม่ถูกอัปโหลดไปไหน
      </p>

      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        compact={!!file}
        onFiles={onFiles}
      />

      {file && (
        <div className="space-y-3 rounded border p-4">
          <p>
            {file.name} ({total} หน้า, {formatSize(file.size)})
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
            <li>รองรับภาษาไทยและอังกฤษ ใช้เวลาประมาณหลายวินาทีต่อหน้า</li>
            <li>ครั้งแรกต้องโหลดโมเดลภาษาประมาณ 16 MB หลังจากนั้นเบราว์เซอร์จะจำไว้</li>
            <li>ความแม่นยำขึ้นกับคุณภาพสแกน ภาษาไทยอาจมีตัวอักษรหรือสระผิดบ้าง</li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? 'กำลังทำงาน...' : 'เริ่ม OCR'}
            </button>
            {busy && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded border px-4 py-2 disabled:opacity-40"
              >
                {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิก'}
              </button>
            )}
          </div>

          {busy && (
            <div className="space-y-1" role="status">
              <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">
                {stage} ({percent}%)
              </p>
              {cancelling && (
                <p className="text-xs text-gray-500">
                  จะหยุดหลังจบหน้าที่กำลังอ่านอยู่
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {result && file && (
        <div className="space-y-3 rounded border border-green-300 bg-green-50 p-4">
          <p className="font-medium text-green-800">
            เสร็จแล้ว ({result.pageCount} หน้า ใช้เวลา {Math.round(result.seconds)} วินาที)
          </p>
          <p className="text-sm text-gray-700">
            ขนาดไฟล์ {formatSize(file.size)} → {formatSize(result.bytes.length)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadBytes(result.bytes, `${baseName}_ocr.pdf`)}
              className="rounded bg-blue-600 px-4 py-2 text-white"
            >
              ดาวน์โหลด PDF ที่ค้นหาได้
            </button>
            <button
              onClick={() =>
                downloadBlob(
                  new Blob([result.text], { type: 'text/plain;charset=utf-8' }),
                  `${baseName}_ocr.txt`
                )
              }
              className="rounded border border-blue-600 px-4 py-2 text-blue-600"
            >
              ดาวน์โหลดข้อความ (.txt)
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}