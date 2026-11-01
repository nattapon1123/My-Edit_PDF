import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import {
  processImage,
  outputName,
  formatSize,
  type OutputFormat,
  type ProcessedImage,
} from '../lib/imageProcess'
import { buildZip } from '../lib/zip'
import { downloadBlob } from '../lib/download'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Entry = {
  id: string
  file: File
  result?: ProcessedImage
  error?: string
}

export default function ImageTool() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [format, setFormat] = useState<OutputFormat>('image/jpeg')
  const [quality, setQuality] = useState(0.8)
  const [maxSide, setMaxSide] = useState('') // ว่าง = ไม่ย่อ
  const [busy, setBusy] = useState(false)

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => IMAGE_TYPES.includes(f.type))
    if (images.length === 0) return
    setEntries((prev) => [
      ...prev,
      ...images.map((file) => ({ id: crypto.randomUUID(), file })),
    ])
  }

  const remove = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id))

  const clearAll = () => setEntries([])

  const handleProcess = async () => {
    setBusy(true)
    const side = parseInt(maxSide, 10)
    const opts = {
      format,
      quality,
      maxSide: side > 0 ? side : null,
    }

    // ล้างผลลัพธ์เก่าก่อน
    setEntries((prev) =>
      prev.map((e) => ({ ...e, result: undefined, error: undefined }))
    )

    // ประมวลผลทีละรูป (ใช้สำเนารายการ ณ ตอนกดปุ่ม)
    for (const entry of entries) {
      try {
        const result = await processImage(entry.file, opts)
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, result } : e))
        )
      } catch (err) {
        console.error(err)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, error: 'ประมวลผลไม่สำเร็จ' } : e
          )
        )
      }
    }

    setBusy(false)
  }

  const showQuality = format !== 'image/png'

  const done = entries.filter((e) => e.result)

  const downloadOne = (e: Entry) => {
    if (!e.result) return
    downloadBlob(e.result.blob, outputName(e.file.name, format))
  }

  const downloadZip = async () => {
    const zip = await buildZip(
      done.map((e) => ({
        name: outputName(e.file.name, format),
        blob: e.result!.blob,
      }))
    )
    downloadBlob(zip, 'images.zip')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">บีบอัด / ย่อ / แปลงรูป</h1>

      <FileDropzone
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        compact={entries.length > 0}
        onFiles={addFiles}
      />

      {/* ตัวเลือก */}
      <div className="space-y-4 rounded border p-4">
        <div>
          <p className="mb-1 text-sm font-medium">รูปแบบผลลัพธ์</p>
          <div className="flex gap-2">
            {(
              [
                ['image/jpeg', 'JPG'],
                ['image/png', 'PNG'],
                ['image/webp', 'WebP'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFormat(value)}
                disabled={busy}
                className={`rounded border px-3 py-1 ${
                  format === value ? 'bg-blue-600 text-white' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showQuality ? (
          <div>
            <p className="mb-1 text-sm font-medium">
              คุณภาพ: {Math.round(quality * 100)}%
            </p>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              disabled={busy}
              className="w-full"
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            PNG ไม่สูญเสียคุณภาพ จึงไม่มีแถบคุณภาพ ลดขนาดได้ด้วยการย่อภาพเท่านั้น
          </p>
        )}

        <div>
          <p className="mb-1 text-sm font-medium">
            ย่อขนาด (ด้านที่ยาวที่สุด, พิกเซล)
          </p>
          <input
            type="number"
            min={1}
            value={maxSide}
            onChange={(e) => setMaxSide(e.target.value)}
            disabled={busy}
            placeholder="เว้นว่าง = ไม่ย่อ เช่น 1920"
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      {/* รายการไฟล์ */}
      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-medium">{entries.length} ไฟล์</p>
            <button
              onClick={clearAll}
              disabled={busy}
              className="text-sm text-red-600 disabled:opacity-40"
            >
              ล้างทั้งหมด
            </button>
          </div>

          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate">{e.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatSize(e.file.size)}
                    {e.result && (
                      <>
                        {' → '}
                        {formatSize(e.result.blob.size)} (
                        {e.result.width}×{e.result.height}){' '}
                        <SavedBadge
                          before={e.file.size}
                          after={e.result.blob.size}
                        />
                      </>
                    )}
                    {e.error && (
                      <span className="text-red-600"> {e.error}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {e.result && (
                    <button
                      onClick={() => downloadOne(e)}
                      className="rounded border px-2 text-sm text-blue-600"
                    >
                      ดาวน์โหลด
                    </button>
                  )}
                  <button
                    onClick={() => remove(e.id)}
                    disabled={busy}
                    className="px-2 text-red-600 disabled:opacity-40"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={handleProcess}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังประมวลผล...' : 'ประมวลผล'}
          </button>

          {done.length > 1 && (
            <button
              onClick={downloadZip}
              disabled={busy}
              className="ml-2 rounded border border-blue-600 px-4 py-2 text-blue-600 disabled:opacity-40"
            >
              ดาวน์โหลดทั้งหมดเป็น ZIP ({done.length} ไฟล์)
            </button>
          )}
        </>
      )}
    </div>
  )
}

// แสดงเปอร์เซ็นต์ที่ลดได้ (หรือเพิ่มขึ้น)
function SavedBadge({ before, after }: { before: number; after: number }) {
  const pct = Math.round((1 - after / before) * 100)
  const smaller = pct >= 0
  return (
    <span className={smaller ? 'text-green-600' : 'text-orange-600'}>
      {smaller ? `ลด ${pct}%` : `ใหญ่ขึ้น ${-pct}%`}
    </span>
  )
}