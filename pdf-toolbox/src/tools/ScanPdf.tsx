import { useEffect, useRef, useState } from 'react'
import { buildScanPdf, type ScanMode, type PageSize, type ScanImage } from '../lib/scanPdf'
import { downloadBytes } from '../lib/download'

type Item = ScanImage & { id: string; url: string }

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const MODES: [ScanMode, string][] = [
  ['original', 'ต้นฉบับ'],
  ['gray', 'โทนเทา'],
  ['bw', 'ขาวดำ'],
]

const SIZES: [PageSize, string][] = [
  ['image', 'ตามขนาดรูป'],
  ['a4', 'A4'],
]

export default function ScanPdf() {
  const [items, setItems] = useState<Item[]>([])
  const [mode, setMode] = useState<ScanMode>('original')
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')

  const cameraRef = useRef<HTMLInputElement>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<Set<string>>(new Set())

  // คืน URL ทั้งหมดตอนออกจากหน้า
  useEffect(() => {
    const urls = urlsRef.current
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const files = Array.from(list)
    const images = files.filter((f) => IMAGE_TYPES.includes(f.type))
    const rejectedCount = files.length - images.length
    if (images.length === 0) {
      setError('รองรับเฉพาะไฟล์ JPEG, PNG และ WebP')
      return
    }
    setError(
      rejectedCount > 0
        ? `ไม่เพิ่ม ${rejectedCount} ไฟล์ เนื่องจากรองรับเฉพาะ JPEG, PNG และ WebP`
        : ''
    )
    const added: Item[] = images.map((file) => {
      const url = URL.createObjectURL(file)
      urlsRef.current.add(url)
      return { id: crypto.randomUUID(), file, rotation: 0, url }
    })
    setItems((prev) => [...prev, ...added])
  }

  const revoke = (url: string) => {
    URL.revokeObjectURL(url)
    urlsRef.current.delete(url)
  }

  const remove = (id: string) => {
    const target = items.find((i) => i.id === id)
    if (target) revoke(target.url)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clearAll = () => {
    items.forEach((i) => revoke(i.url))
    setItems([])
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const rotate = (id: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, rotation: ((i.rotation + 90) % 360) as ScanImage['rotation'] }
          : i
      )
    )

  const handleBuild = async () => {
    if (items.length === 0) return
    setBusy(true)
    setError('')
    try {
      const result = await buildScanPdf(
        items.map((i) => ({ file: i.file, rotation: i.rotation })),
        { mode, brightness, contrast, pageSize },
        (done, total) => setProgress(`${done}/${total}`)
      )
      downloadBytes(result, 'scan.pdf')
    } catch (e) {
      console.error(e)
      setError('สร้าง PDF ไม่สำเร็จ ลองลดจำนวนรูปหรือใช้รูปที่เล็กลง')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">สแกนเป็น PDF</h1>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
        >
          ถ่ายภาพเอกสาร
        </button>
        <button
          onClick={() => pickRef.current?.click()}
          disabled={busy}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          เลือกรูปจากเครื่อง
        </button>
      </div>
      <p className="text-xs text-gray-500">
        บนมือถือปุ่มถ่ายภาพจะเปิดกล้องหลัง ถ่ายทีละหน้า กดถ่ายซ้ำเพื่อเพิ่มหน้าถัดไป บนคอมจะเปิดหน้าต่างเลือกไฟล์
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={pickRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-medium">{items.length} หน้า</p>
            <button
              onClick={clearAll}
              disabled={busy}
              className="text-sm text-red-600 disabled:opacity-40"
            >
              ล้างทั้งหมด
            </button>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item, i) => (
              <li key={item.id} className="rounded border p-1">
                <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-gray-100">
                  <span className="absolute left-1 top-1 z-10 rounded bg-blue-500 px-1.5 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <img
                    src={item.url}
                    alt={`หน้า ${i + 1}`}
                    className="max-h-full max-w-full transition-transform"
                    style={{ transform: `rotate(${item.rotation}deg)` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    className="px-2 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={busy || i === items.length - 1}
                    className="px-2 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => rotate(item.id)}
                    disabled={busy}
                    className="px-2"
                    title="หมุน 90°"
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    disabled={busy}
                    className="px-2 text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-4 rounded border p-4">
            <div>
              <p className="mb-1 text-sm font-medium">โหมดภาพ</p>
              <div className="flex flex-wrap gap-2">
                {MODES.map(([v, label]) => (
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
              </div>
              {mode === 'bw' && (
                <p className="mt-1 text-xs text-gray-500">
                  ขาวดำเหมาะกับเอกสารที่แสงสม่ำเสมอ ถ้ามีเงา ลองใช้โหมดโทนเทาแทน
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">
                  ความสว่าง: {brightness}
                </span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  disabled={busy}
                  className="w-full"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">
                  คอนทราสต์: {contrast}
                </span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  disabled={busy}
                  className="w-full"
                />
              </label>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium">ขนาดหน้า</p>
              <div className="flex gap-2">
                {SIZES.map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setPageSize(v)}
                    disabled={busy}
                    className={`rounded border px-3 py-1 ${
                      pageSize === v ? 'bg-blue-600 text-white' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleBuild}
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? `กำลังสร้าง ${progress}...` : `สร้าง PDF (${items.length} หน้า)`}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}