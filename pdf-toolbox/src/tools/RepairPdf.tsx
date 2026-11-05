import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { repairPdf, type RepairResult } from '../lib/repairPdf'
import { downloadBytes } from '../lib/download'

export default function RepairPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<RepairResult | null>(null)
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFiles = (files: File[]) => {
    // ไฟล์เสียบางไฟล์เบราว์เซอร์ไม่ระบุ MIME จึงเช็กนามสกุลด้วย
    const pdf = files.find(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (!pdf) {
      setError('รองรับเฉพาะไฟล์ PDF')
      return
    }
    setError('')
    setResult(null)
    setFile(pdf)
  }

  const handleRepair = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    setProgress('')

    try {
      const r = await repairPdf(file, (done, total) =>
        setProgress(`${done}/${total}`)
      )
      setResult(r)
    } catch (e) {
      console.error(e)
      setError('ซ่อมไม่สำเร็จ ไฟล์อาจเสียหนักเกินไปหรือมีรหัสผ่านป้องกันอยู่')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const handleDownload = () => {
    if (!file || !result) return
    const base = file.name.replace(/\.[^.]+$/, '')
    downloadBytes(result.bytes, `${base}_repaired.pdf`)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">ซ่อม PDF</h1>

      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        compact={!!file}
        onFiles={onFiles}
      />

      {file && (
        <div className="space-y-3 rounded border p-4">
          <p>{file.name}</p>
          <p className="text-xs text-gray-500">
            ระบบจะลองซ่อมโครงสร้างไฟล์ก่อน (ข้อความยังเลือกได้) ถ้าไม่สำเร็จจะแปลงแต่ละหน้าเป็นรูปแล้วสร้างไฟล์ใหม่ (ข้อความจะเลือกไม่ได้)
          </p>
          <button
            onClick={handleRepair}
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {busy ? `กำลังซ่อม ${progress}...` : 'ซ่อมไฟล์'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded border border-green-300 bg-green-50 p-4">
          <p className="font-medium text-green-800">ซ่อมสำเร็จ ({result.pageCount} หน้า)</p>

          {result.level === 'rebuild' ? (
            <p className="text-sm text-gray-700">
              สร้างโครงสร้างไฟล์ใหม่แล้ว ข้อความและเนื้อหาเดิมยังอยู่ครบ
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              ซ่อมโครงสร้างไม่ได้ จึงแปลงแต่ละหน้าเป็นรูปแล้วสร้างไฟล์ใหม่
              ข้อความในไฟล์จะเลือกหรือค้นหาไม่ได้
            </p>
          )}

          {result.skippedPages.length > 0 && (
            <p className="text-sm text-orange-700">
              กู้ไม่ได้ {result.skippedPages.length} หน้า (หน้าที่ {result.skippedPages.join(', ')}) จึงไม่อยู่ในไฟล์ใหม่
            </p>
          )}

          <button
            onClick={handleDownload}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            ดาวน์โหลดไฟล์ที่ซ่อมแล้ว
          </button>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}