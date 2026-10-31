import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount } from '../lib/splitPdf'
import { rotatePages } from '../lib/rotatePdf'
import { parsePageRange } from '../lib/pageRange'
import { downloadBytes } from '../lib/download'

export default function RotatePdf() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [range, setRange] = useState('')
  const [angle, setAngle] = useState<90 | 180 | 270>(90)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) return
    setError('')
    try {
      setTotal(await getPageCount(pdf))
      setFile(pdf)
    } catch {
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleRotate = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      // ถ้าเว้นว่าง = หมุนทุกหน้า
      const indices = range.trim() ? parsePageRange(range, total) : null
      const result = await rotatePages(file, angle, indices)
      downloadBytes(result, 'rotated.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">หมุนหน้า PDF</h1>
      <FileDropzone accept="application/pdf" onFiles={onFiles} />

      {file && (
        <div className="space-y-3 rounded border p-4">
          <p>{file.name} ({total} หน้า)</p>

          <div className="flex gap-2">
            {([90, 180, 270] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`rounded border px-3 py-1 ${
                  angle === a ? 'bg-blue-600 text-white' : ''
                }`}
              >
                {a}°
              </button>
            ))}
          </div>

          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="หน้าที่จะหมุน เช่น 1-3, 5 (เว้นว่าง = ทุกหน้า)"
            className="w-full rounded border p-2"
          />
          <button
            onClick={handleRotate}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังทำงาน...' : 'หมุนและดาวน์โหลด'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}