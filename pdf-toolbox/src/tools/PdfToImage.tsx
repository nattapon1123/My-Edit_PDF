import { useEffect, useRef, useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { parsePageRange } from '../lib/pageRange'
import { formatSize } from '../lib/imageProcess'
import { buildZip } from '../lib/zip'
import { downloadBlob } from '../lib/download'
import {
  getPdfPageCount,
  renderPdfToImages,
  type ImageFormat,
  type RenderedImage,
} from '../lib/pdfToImage'

type Result = RenderedImage & { id: string; url: string; ext: string }

export default function PdfToImage() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [range, setRange] = useState('')
  const [format, setFormat] = useState<ImageFormat>('image/jpeg')
  const [scale, setScale] = useState(2)
  const [quality, setQuality] = useState(0.9)
  const [results, setResults] = useState<Result[]>([])
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // เก็บ url ปัจจุบันไว้ revoke ตอนล้างและตอนออกจากหน้า
  const urlsRef = useRef<string[]>([])

  const revokeAll = () => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlsRef.current = []
  }

  useEffect(() => revokeAll, [])

  const onFiles = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) return
    setError('')
    try {
      const count = await getPdfPageCount(pdf)
      revokeAll()
      setResults([])
      setFile(pdf)
      setTotal(count)
      setRange('')
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleConvert = async () => {
    if (!file) return
    setError('')

    let indices: number[] | null = null
    try {
      indices = range.trim() ? parsePageRange(range, total) : null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ช่วงหน้าไม่ถูกต้อง')
      return
    }

    setBusy(true)
    revokeAll()
    setResults([])

    const ext = format === 'image/png' ? 'png' : 'jpg'

    try {
      await renderPdfToImages(
        file,
        { format, scale, quality, pageIndices: indices },
        (img, done, count) => {
          const url = URL.createObjectURL(img.blob)
          urlsRef.current.push(url)
          setResults((prev) => [
            ...prev,
            { ...img, id: crypto.randomUUID(), url, ext },
          ])
          setProgress(`${done}/${count}`)
        }
      )
    } catch (e) {
      console.error(e)
      setError('แปลงไม่สำเร็จ ลองลดความละเอียดหรือเลือกจำนวนหน้าน้อยลง')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : 'page'
  const imageName = (r: Result) => `${baseName}_p${r.pageIndex + 1}.${r.ext}`
  const downloadZip = async () => {
    const zip = await buildZip(
      results.map((r) => ({ name: imageName(r), blob: r.blob }))
    )
    downloadBlob(zip, `${baseName}_images.zip`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">PDF เป็นรูป</h1>

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
            <p className="mb-1 text-sm font-medium">รูปแบบ</p>
            <div className="flex gap-2">
              {(
                [
                  ['image/jpeg', 'JPG'],
                  ['image/png', 'PNG'],
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

          <div>
            <p className="mb-1 text-sm font-medium">ความละเอียด</p>
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  disabled={busy}
                  className={`rounded border px-3 py-1 ${
                    scale === s ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              1x ≈ 72 dpi, 2x ≈ 144 dpi, 3x ≈ 216 dpi (ยิ่งสูงยิ่งคมแต่ไฟล์ใหญ่และช้า)
            </p>
          </div>

          {format === 'image/jpeg' && (
            <div>
              <p className="mb-1 text-sm font-medium">
                คุณภาพ JPG: {Math.round(quality * 100)}%
              </p>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                disabled={busy}
                className="w-full"
              />
            </div>
          )}

          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={busy}
            placeholder="หน้าที่จะแปลง เช่น 1-3, 5 (เว้นว่าง = ทุกหน้า)"
            className="w-full rounded border p-2"
          />

          <button
            onClick={handleConvert}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? `กำลังแปลง ${progress}...` : 'แปลงเป็นรูป'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}

      {results.length > 0 && (
        <>
          {results.length > 1 && (
            <button
              onClick={downloadZip}
              disabled={busy}
              className="rounded border border-blue-600 px-4 py-2 text-blue-600 disabled:opacity-40"
            >
              ดาวน์โหลดทั้งหมดเป็น ZIP ({results.length} ไฟล์)
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((r) => (
              <div key={r.id} className="rounded border p-1">
                <img src={r.url} alt={imageName(r)} className="w-full" />
                <p className="mt-1 truncate text-center text-xs text-gray-500">
                  หน้า {r.pageIndex + 1} · {r.width}×{r.height} · {formatSize(r.blob.size)}
                </p>
                <button
                  onClick={() => downloadBlob(r.blob, imageName(r))}
                  className="mt-1 w-full rounded border py-1 text-sm text-blue-600"
                >
                  ดาวน์โหลด
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}