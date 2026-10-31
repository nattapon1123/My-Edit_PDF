import { useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import { mergePdfs } from '../lib/mergePdf'
import { downloadBytes } from '../lib/download'

export default function MergePdf() {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const addFiles = (newFiles: File[]) => {
    const pdfs = newFiles.filter((f) => f.type === 'application/pdf')
    setFiles((prev) => [...prev, ...pdfs])
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= files.length) return
    const next = [...files]
    ;[next[index], next[target]] = [next[target], next[index]]
    setFiles(next)
  }

  const remove = (index: number) => setFiles(files.filter((_, i) => i !== index))

  const handleMerge = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await mergePdfs(files)
      downloadBytes(result, 'merged.pdf')
    } catch (e) {
      setError('รวมไฟล์ไม่สำเร็จ ไฟล์อาจเสียหรือมีรหัสผ่านป้องกันอยู่')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">รวมไฟล์ PDF</h1>
      <FileDropzone accept="application/pdf" multiple onFiles={addFiles} />

      <ul className="space-y-2">
        {files.map((f, i) => (
          <li key={i} className="flex items-center justify-between rounded border p-2">
            <span className="truncate">{i + 1}. {f.name}</span>
            <span className="flex gap-1">
              <button onClick={() => move(i, -1)} className="px-2">↑</button>
              <button onClick={() => move(i, 1)} className="px-2">↓</button>
              <button onClick={() => remove(i)} className="px-2 text-red-600">ลบ</button>
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="text-red-600">{error}</p>}

      <button
        onClick={handleMerge}
        disabled={files.length < 2 || busy}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
      >
        {busy ? 'กำลังรวม...' : 'รวมไฟล์'}
      </button>
    </div>
  )
}