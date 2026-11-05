import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { compressPdf, type CompressLevel, type CompressResult } from '../lib/compressPdf'
import { downloadBlob } from '../lib/download'
import { formatSize } from '../lib/imageProcess'

const LEVELS: [CompressLevel, string, string][] = [
  ['low', 'คุณภาพสูง', 'ลดขนาดน้อย รูปยังคมชัด'],
  ['medium', 'สมดุล', 'แนะนำ'],
  ['high', 'ลดขนาดมาก', 'รูปคุณภาพต่ำลง'],
]

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressLevel>('medium')
  const [result, setResult] = useState<CompressResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf')
    if (!pdf) {
      setError('กรุณาเลือกไฟล์ PDF')
      return
    }
    setError('')
    setResult(null)
    setFile(pdf)
  }

  const handleCompress = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setResult(await compressPdf(file, level))
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'บีบอัดไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = () => {
    if (!file || !result) return
    const base = file.name.replace(/\.[^.]+$/, '')
    downloadBlob(result.blob, `${base}_compressed.pdf`)
  }

  const savedPct = result
    ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
    : 0

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">บีบอัด PDF</h1>

      <FileDropzone
        accept="application/pdf"
        disabled={busy}
        compact={!!file}
        onFiles={onFiles}
      />

      {file && (
        <div className="space-y-4 rounded border p-4">
          <p>
            {file.name} ({formatSize(file.size)})
          </p>

          <div>
            <p className="mb-1 text-sm font-medium">ระดับการบีบอัด</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(([value, label, hint]) => (
                <button
                  key={value}
                  onClick={() => setLevel(value)}
                  disabled={busy}
                  className={`rounded border px-3 py-1 ${
                    level === value ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {label}
                  <span className="ml-1 text-xs opacity-70">({hint})</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCompress}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังบีบอัด...' : 'บีบอัด'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded border p-4">
          {result.status === 'reduced' ? (
            <p className="text-green-600">
              ลดลงจาก {formatSize(result.originalSize)} เหลือ{' '}
              {formatSize(result.compressedSize)} (ลด {savedPct}%)
            </p>
          ) : (
            <p className="text-orange-600">
              ไฟล์นี้บีบเพิ่มไม่ได้ ระบบจึงคงไฟล์เดิมไว้ ({formatSize(result.originalSize)})
            </p>
          )}
          <button
            onClick={handleDownload}
            className="rounded border border-blue-600 px-4 py-2 text-blue-600"
          >
            ดาวน์โหลด
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}