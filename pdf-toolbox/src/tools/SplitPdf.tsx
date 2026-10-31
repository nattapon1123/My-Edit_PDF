import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount, extractPages } from '../lib/splitPdf'
import { parsePageRange } from '../lib/pageRange'
import { downloadBytes } from '../lib/download'

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
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
    } catch {
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const handleExtract = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const indices = parsePageRange(range, total)
      const result = await extractPages(file, indices)
      downloadBytes(result, 'extracted.pdf')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">แยกหน้า PDF</h1>
      <FileDropzone accept="application/pdf" onFiles={onFiles} />

      {file && (
        <div className="space-y-3 rounded border p-4">
          <p>{file.name} ({total} หน้า)</p>
          <input
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="เช่น 1-3, 5, 8-10"
            className="w-full rounded border p-2"
          />
          <button
            onClick={handleExtract}
            disabled={!range.trim() || busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? 'กำลังทำงาน...' : 'ดึงหน้าที่เลือก'}
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}