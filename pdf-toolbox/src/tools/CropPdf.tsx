import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount } from '../lib/splitPdf'
import { parsePageRange } from '../lib/pageRange'
import { renderPagePreview } from '../lib/renderPage'
import { cropPdf, type CropMargins } from '../lib/cropPdf'
import { downloadBytes } from '../lib/download'

const SIDES: [keyof CropMargins, string][] = [
  ['top', 'ตัดด้านบน'],
  ['bottom', 'ตัดด้านล่าง'],
  ['left', 'ตัดด้านซ้าย'],
  ['right', 'ตัดด้านขวา'],
]

const ZERO: CropMargins = { top: 0, bottom: 0, left: 0, right: 0 }

export default function CropPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [preview, setPreview] = useState('')
  const [margins, setMargins] = useState<CropMargins>(ZERO)
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) return
    setError('')
    try {
      const count = await getPageCount(pdf)
      const url = await renderPagePreview(pdf)
      setTotal(count)
      setPreview(url)
      setFile(pdf)
      setMargins(ZERO)
      setRange('')
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const setSide = (key: keyof CropMargins, value: number) =>
    setMargins((prev) => ({ ...prev, [key]: value }))

  const handleCrop = async () => {
    if (!file) return
    setError('')

    const { top, bottom, left, right } = margins
    if (top + bottom + left + right === 0) {
      setError('ยังไม่ได้ตั้งระยะตัด เลื่อนแถบอย่างน้อยหนึ่งด้านก่อน')
      return
    }
    if (left + right > 90 || top + bottom > 90) {
      setError('ตัดมากเกินไป ต้องเหลือพื้นที่อย่างน้อย 10% ในแต่ละแนว')
      return
    }

    let indices: number[] | null = null
    try {
      indices = range.trim() ? parsePageRange(range, total) : null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ช่วงหน้าไม่ถูกต้อง')
      return
    }

    setBusy(true)
    try {
      const result = await cropPdf(file, margins, indices)
      const base = file.name.replace(/\.[^.]+$/, '')
      downloadBytes(result, `${base}_cropped.pdf`)
    } catch (e) {
      console.error(e)
      setError('ครอบตัดไม่สำเร็จ ไฟล์อาจเสียหรือมีรหัสผ่านป้องกันอยู่')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">ครอบตัด PDF</h1>

      <FileDropzone
        accept="application/pdf"
        disabled={busy}
        compact={!!file}
        onFiles={onFiles}
      />

      {file && (
        <div className="space-y-4 rounded border p-4">
          <p>
            {file.name} ({total} หน้า)
          </p>

          {/* ภาพตัวอย่างหน้าแรก พร้อมกรอบครอบตัด */}
          <div className="relative mx-auto w-full max-w-md overflow-hidden border bg-gray-100">
            <img src={preview} alt="ตัวอย่างหน้าแรก" className="block w-full select-none" draggable={false} />
            <div
              className="pointer-events-none absolute border-2 border-blue-500"
              style={{
                top: `${margins.top}%`,
                bottom: `${margins.bottom}%`,
                left: `${margins.left}%`,
                right: `${margins.right}%`,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              }}
            />
          </div>
          <p className="text-center text-xs text-gray-500">
            ตัวอย่างจากหน้าแรก ส่วนที่มืดคือส่วนที่จะถูกตัดออก (ค่าเดียวกันใช้กับทุกหน้าที่เลือก)
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SIDES.map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="mb-1 block font-medium">
                  {label}: {margins[key]}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={margins[key]}
                  onChange={(e) => setSide(key, parseInt(e.target.value, 10))}
                  disabled={busy}
                  className="w-full"
                />
              </label>
            ))}
          </div>

          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={busy}
            placeholder="หน้าที่จะครอบตัด เช่น 1-3, 5 (เว้นว่าง = ทุกหน้า)"
            className="w-full rounded border p-2"
          />

          <div className="flex gap-2">
            <button
              onClick={handleCrop}
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? 'กำลังทำงาน...' : 'ครอบตัดและดาวน์โหลด'}
            </button>
            <button
              onClick={() => setMargins(ZERO)}
              disabled={busy}
              className="rounded border px-4 py-2 disabled:opacity-40"
            >
              รีเซ็ต
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}