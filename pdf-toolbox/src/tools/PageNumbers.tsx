import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount } from '../lib/splitPdf'
import {
  addPageNumbers,
  type HPos,
  type VPos,
  type NumberFormat,
} from '../lib/pageNumbers'
import { downloadBytes } from '../lib/download'

const H_OPTIONS: [HPos, string][] = [
  ['left', 'ซ้าย'],
  ['center', 'กลาง'],
  ['right', 'ขวา'],
]

const V_OPTIONS: [VPos, string][] = [
  ['top', 'บน'],
  ['bottom', 'ล่าง'],
]

const FORMAT_OPTIONS: [NumberFormat, string][] = [
  ['n', '1'],
  ['page-n', 'Page 1'],
  ['n-of-total', '1 / 10'],
  ['page-n-of-total', 'Page 1 of 10'],
]

export default function PageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [hPos, setHPos] = useState<HPos>('center')
  const [vPos, setVPos] = useState<VPos>('bottom')
  const [format, setFormat] = useState<NumberFormat>('n')
  const [startNumber, setStartNumber] = useState('1')
  const [fromPage, setFromPage] = useState('1')
  const [fontSize, setFontSize] = useState('12')
  const [margin, setMargin] = useState('30')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) return
    setError('')
    try {
      setTotal(await getPageCount(pdf))
      setFile(pdf)
      setFromPage('1')
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleAdd = async () => {
    if (!file) return
    setError('')

    const start = parseInt(startNumber, 10)
    const from = parseInt(fromPage, 10)
    const size = parseFloat(fontSize)
    const mar = parseFloat(margin)

    if (!Number.isInteger(start) || start < 0) {
      setError('เลขเริ่มต้นต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป')
      return
    }
    if (!Number.isInteger(from) || from < 1 || from > total) {
      setError(`หน้าแรกที่เริ่มใส่ต้องอยู่ระหว่าง 1 ถึง ${total}`)
      return
    }
    if (!(size >= 4 && size <= 72)) {
      setError('ขนาดตัวอักษรต้องอยู่ระหว่าง 4 ถึง 72')
      return
    }
    if (!(mar >= 0 && mar <= 200)) {
      setError('ระยะจากขอบต้องอยู่ระหว่าง 0 ถึง 200')
      return
    }

    setBusy(true)
    try {
      const result = await addPageNumbers(file, {
        hPos,
        vPos,
        format,
        startNumber: start,
        fromPage: from,
        fontSize: size,
        margin: mar,
      })
      const base = file.name.replace(/\.[^.]+$/, '')
      downloadBytes(result, `${base}_numbered.pdf`)
    } catch (e) {
      console.error(e)
      setError('ใส่เลขหน้าไม่สำเร็จ ไฟล์อาจเสียหรือมีรหัสผ่านป้องกันอยู่')
    } finally {
      setBusy(false)
    }
  }

  // ปุ่มเลือกแบบกลุ่ม ใช้ร่วมกันทุกตัวเลือก
  const choice = <T extends string>(
    options: [T, string][],
    value: T,
    set: (v: T) => void
  ) => (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => set(v)}
          disabled={busy}
          className={`rounded border px-3 py-1 ${
            value === v ? 'bg-blue-600 text-white' : ''
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">ใส่หมายเลขหน้า</h1>

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

          <div>
            <p className="mb-1 text-sm font-medium">ตำแหน่งแนวตั้ง</p>
            {choice(V_OPTIONS, vPos, setVPos)}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">ตำแหน่งแนวนอน</p>
            {choice(H_OPTIONS, hPos, setHPos)}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">รูปแบบข้อความ</p>
            {choice(FORMAT_OPTIONS, format, setFormat)}
            <p className="mt-1 text-xs text-gray-500">
              ตอนนี้รองรับตัวเลขและภาษาอังกฤษเท่านั้น (ฟอนต์ไทยจะเพิ่มทีหลัง)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">เลขเริ่มต้น</span>
              <input
                type="number"
                min={0}
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                เริ่มใส่ตั้งแต่หน้าที่
              </span>
              <input
                type="number"
                min={1}
                max={total}
                value={fromPage}
                onChange={(e) => setFromPage(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">ขนาดตัวอักษร</span>
              <input
                type="number"
                min={4}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">ระยะจากขอบ</span>
              <input
                type="number"
                min={0}
                max={200}
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
          </div>

          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังทำงาน...' : 'ใส่เลขหน้าและดาวน์โหลด'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}