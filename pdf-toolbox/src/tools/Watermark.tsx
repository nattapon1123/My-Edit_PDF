import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount } from '../lib/splitPdf'
import { parsePageRange } from '../lib/pageRange'
import { addWatermark } from '../lib/watermark'
import { downloadBytes } from '../lib/download'

// แปลง "#rrggbb" เป็น {r,g,b} ช่วง 0-1
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  }
}

export default function Watermark() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState('48')
  const [color, setColor] = useState('#888888')
  const [opacity, setOpacity] = useState(0.3)
  const [angle, setAngle] = useState('45')
  const [mode, setMode] = useState<'center' | 'tile'>('center')
  const [bold, setBold] = useState(true)
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) return
    setError('')
    try {
      setTotal(await getPageCount(pdf))
      setFile(pdf)
      setRange('')
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleAdd = async () => {
    if (!file) return
    setError('')

    const size = parseFloat(fontSize)
    const ang = parseFloat(angle)
    const minSize = mode === 'tile' ? 12 : 8

    if (!text.trim()) {
      setError('กรุณาพิมพ์ข้อความลายน้ำ')
      return
    }
    if (!(size >= minSize && size <= 300)) {
      setError(`ขนาดตัวอักษรต้องอยู่ระหว่าง ${minSize} ถึง 300`)
      return
    }
    if (!(ang >= -180 && ang <= 180)) {
      setError('มุมเอียงต้องอยู่ระหว่าง -180 ถึง 180')
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
      const result = await addWatermark(file, {
        text: text.trim(),
        fontSize: size,
        color: hexToRgb(color),
        opacity,
        angle: ang,
        mode,
        bold,
        pageIndices: indices,
      })
      const base = file.name.replace(/\.[^.]+$/, '')
      downloadBytes(result, `${base}_watermark.pdf`)
    } catch (e) {
      console.error(e)
      setError(
        'ใส่ลายน้ำไม่สำเร็จ อาจมีตัวอักษรที่ฟอนต์ไม่รองรับ (รองรับไทยและอังกฤษ) หรือไฟล์มีรหัสผ่านป้องกันอยู่'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">ใส่ลายน้ำ</h1>

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

          <label className="block text-sm">
            <span className="mb-1 block font-medium">ข้อความลายน้ำ</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              placeholder="เช่น CONFIDENTIAL หรือ ห้ามเผยแพร่"
              className="w-full rounded border p-2"
            />
            <span className="mt-1 block text-xs text-gray-500">
              รองรับภาษาไทยและอังกฤษ
            </span>
          </label>

          <div>
            <p className="mb-1 text-sm font-medium">รูปแบบการวาง</p>
            <div className="flex gap-2">
              {(
                [
                  ['center', 'กึ่งกลางหน้า'],
                  ['tile', 'ปูซ้ำเต็มหน้า'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  disabled={busy}
                  className={`rounded border px-3 py-1 ${
                    mode === v ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setBold((b) => !b)}
                disabled={busy}
                className={`ml-auto rounded border px-3 py-1 font-bold ${
                  bold ? 'bg-blue-600 text-white' : ''
                }`}
              >
                B
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">ขนาดตัวอักษร</span>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">มุมเอียง (องศา)</span>
              <input
                type="number"
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                disabled={busy}
                className="w-full rounded border p-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">สี</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={busy}
                className="h-10 w-full rounded border"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                ความโปร่งใส: {Math.round(opacity * 100)}%
              </span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                disabled={busy}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={busy}
            placeholder="หน้าที่จะใส่ เช่น 1-3, 5 (เว้นว่าง = ทุกหน้า)"
            className="w-full rounded border p-2"
          />

          <button
            onClick={handleAdd}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังทำงาน...' : 'ใส่ลายน้ำและดาวน์โหลด'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}