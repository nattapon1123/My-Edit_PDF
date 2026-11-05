import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import FileDropzone from '../components/FileDropzone'
import { getPageCount } from '../lib/splitPdf'
import { renderPageForEdit } from '../lib/renderPage'
import {
  applyEdits,
  prepareImage,
  LINE_HEIGHT,
  type TextEdit,
  type ImageEdit,
  type EditColor,
} from '../lib/editPdf'
import { downloadBytes } from '../lib/download'

type UiImage = ImageEdit & { url: string } // url = ไว้แสดงตัวอย่างบนหน้าจอ
type UiItem = TextEdit | UiImage
type Preview = { url: string; widthPt: number; heightPt: number }

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function hexToRgb(hex: string): EditColor {
  const n = parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

function rgbToHex(c: EditColor): string {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

export default function EditPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [total, setTotal] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadingPage, setLoadingPage] = useState(false)
  const [items, setItems] = useState<UiItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dispW, setDispW] = useState(0) // ความกว้างที่แสดงบนจอ (px)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const wrapRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<Set<string>>(new Set())
  const reqRef = useRef(0) // กันผลของคำขอเก่าทับคำขอใหม่ตอนเปลี่ยนหน้าเร็วๆ
  const dragRef = useRef<{
    id: string
    sx: number
    sy: number
    ox: number
    oy: number
  } | null>(null)

  // คืน URL ของรูปทั้งหมดตอนออกจากหน้า
  useEffect(() => {
    const urls = urlsRef.current
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
      urls.clear()
    }
  }, [])

  // โหลดภาพตัวอย่างทุกครั้งที่เปลี่ยนไฟล์หรือเปลี่ยนหน้า
  useEffect(() => {
    if (!file) return
    const id = ++reqRef.current
    setLoadingPage(true)
    renderPageForEdit(file, pageIndex)
      .then((p) => {
        if (id === reqRef.current) setPreview(p)
      })
      .catch((e) => {
        console.error(e)
        if (id === reqRef.current) setError('แสดงตัวอย่างหน้านี้ไม่ได้')
      })
      .finally(() => {
        if (id === reqRef.current) setLoadingPage(false)
      })
  }, [file, pageIndex])

  // วัดความกว้างที่แสดงจริง เพื่อคำนวณตัวคูณ pt -> px (อัปเดตตอนย่อ/ขยายหน้าต่าง)
  const hasPreview = !!preview
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setDispW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasPreview])

  const scale = preview && dispW > 0 ? dispW / preview.widthPt : 0

  const revokeUrl = (url: string) => {
    URL.revokeObjectURL(url)
    urlsRef.current.delete(url)
  }

  const onFiles = async (files: File[]) => {
    const pdf = files.find(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (!pdf) {
      setError('รองรับเฉพาะไฟล์ PDF')
      return
    }
    setError('')
    try {
      const count = await getPageCount(pdf)
      items.forEach((i) => i.kind === 'image' && revokeUrl(i.url))
      setItems([])
      setSelectedId(null)
      setPreview(null)
      setPageIndex(0)
      setTotal(count)
      setFile(pdf)
    } catch (e) {
      console.error(e)
      setError('เปิดไฟล์ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน')
    }
  }

  const updateItem = (id: string, patch: Record<string, unknown>) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? ({ ...i, ...patch } as UiItem) : i))
    )

  const deleteItem = (id: string) => {
    const target = items.find((i) => i.id === id)
    if (target?.kind === 'image') revokeUrl(target.url)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setSelectedId(null)
  }

  // วางชิ้นใหม่เยื้องกันเล็กน้อย ไม่ให้ซ้อนทับกันพอดี
  const nextOffset = () => {
    const onPage = items.filter((i) => i.pageIndex === pageIndex).length
    return (onPage % 8) * 20
  }

  const addText = () => {
    if (!preview) return
    const off = nextOffset()
    const item: TextEdit = {
      id: crypto.randomUUID(),
      kind: 'text',
      pageIndex,
      x: preview.widthPt * 0.1 + off,
      y: preview.heightPt * 0.1 + off,
      text: 'ข้อความ',
      fontSize: 24,
      color: { r: 0, g: 0, b: 0 },
      bold: false,
    }
    setItems((prev) => [...prev, item])
    setSelectedId(item.id)
  }

  const onPickImage = async (list: FileList | null) => {
    const f = list?.[0]
    if (!f || !preview) return
    if (!IMAGE_TYPES.includes(f.type)) {
      setError('รองรับเฉพาะรูป JPEG, PNG และ WebP')
      return
    }
    setError('')
    try {
      const img = await prepareImage(f)
      const url = URL.createObjectURL(new Blob([img.bytes as BlobPart], { type: img.mime }))
      urlsRef.current.add(url)

      const off = nextOffset()
      const width = Math.min(200, preview.widthPt * 0.5)
      const item: UiImage = {
        id: crypto.randomUUID(),
        kind: 'image',
        pageIndex,
        x: preview.widthPt * 0.1 + off,
        y: preview.heightPt * 0.1 + off,
        width,
        height: (width * img.height) / img.width,
        bytes: img.bytes,
        mime: img.mime,
        url,
      }
      setItems((prev) => [...prev, item])
      setSelectedId(item.id)
    } catch (e) {
      console.error(e)
      setError('เพิ่มรูปไม่สำเร็จ ไฟล์รูปอาจเสีย')
    }
  }

  // ---- ลากย้าย ----
  const startDrag = (e: ReactPointerEvent<HTMLElement>, item: UiItem) => {
    e.stopPropagation()
    setSelectedId(item.id)
    dragRef.current = { id: item.id, sx: e.clientX, sy: e.clientY, ox: item.x, oy: item.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveDrag = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current
    if (!d || !preview || scale <= 0) return
    updateItem(d.id, {
      x: clamp(d.ox + (e.clientX - d.sx) / scale, 0, preview.widthPt - 5),
      y: clamp(d.oy + (e.clientY - d.sy) / scale, 0, preview.heightPt - 5),
    })
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleSave = async () => {
    if (!file || items.length === 0) return
    setBusy(true)
    setError('')
    try {
      const bytes = await applyEdits(file, items)
      const base = file.name.replace(/\.[^.]+$/, '')
      downloadBytes(bytes, `${base}_edited.pdf`)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ ไฟล์อาจเสียหรือมีรหัสผ่านป้องกันอยู่')
    } finally {
      setBusy(false)
    }
  }

  const pageItems = items.filter((i) => i.pageIndex === pageIndex)
  const selected = items.find((i) => i.id === selectedId) ?? null
  const outline = (id: string) =>
    id === selectedId ? 'outline-1 outline-dashed outline-blue-500' : ''

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">แก้ไข PDF</h1>
      <p className="text-sm text-gray-600">
        เพิ่มข้อความและรูปลงบนหน้า PDF (ยังแก้หรือลบข้อความเดิมในไฟล์ไม่ได้)
      </p>

      <FileDropzone
        accept="application/pdf,.pdf"
        disabled={busy}
        compact={!!file}
        onFiles={onFiles}
      />

      {file && (
        <div className="space-y-3 rounded border p-4">
          <p>
            {file.name} ({total} หน้า)
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPageIndex((p) => p - 1)}
              disabled={busy || pageIndex === 0}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              ◀
            </button>
            <span className="text-sm">
              หน้า {pageIndex + 1} / {total}
            </span>
            <button
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={busy || pageIndex >= total - 1}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              ▶
            </button>

            <div className="ml-auto flex gap-2">
              <button
                onClick={addText}
                disabled={busy || !preview}
                className="rounded border border-blue-600 px-3 py-1 text-blue-600 disabled:opacity-40"
              >
                + ข้อความ
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={busy || !preview}
                className="rounded border border-blue-600 px-3 py-1 text-blue-600 disabled:opacity-40"
              >
                + รูป
              </button>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              onPickImage(e.target.files)
              e.target.value = ''
            }}
          />

          {loadingPage && <p className="text-sm text-gray-500">กำลังโหลดหน้า...</p>}

          {preview && (
            <div
              ref={wrapRef}
              onPointerDown={() => setSelectedId(null)}
              className="relative mx-auto w-full max-w-2xl select-none overflow-hidden border bg-gray-100"
            >
              <img
                src={preview.url}
                alt={`หน้า ${pageIndex + 1}`}
                draggable={false}
                className={`block w-full ${loadingPage ? 'opacity-50' : ''}`}
              />

              {scale > 0 &&
                pageItems.map((item) =>
                  item.kind === 'text' ? (
                    <div
                      key={item.id}
                      onPointerDown={(e) => startDrag(e, item)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className={`absolute cursor-move touch-none ${outline(item.id)}`}
                      style={{
                        left: item.x * scale,
                        top: item.y * scale,
                        fontSize: item.fontSize * scale,
                        lineHeight: LINE_HEIGHT,
                        color: rgbToHex(item.color),
                        fontWeight: item.bold ? 700 : 400,
                        fontFamily: "'Sarabun', sans-serif",
                        whiteSpace: 'pre',
                        minWidth: '1em',
                        minHeight: '1em',
                      }}
                    >
                      {item.text}
                    </div>
                  ) : (
                    <img
                      key={item.id}
                      src={item.url}
                      alt=""
                      draggable={false}
                      onPointerDown={(e) => startDrag(e, item)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      className={`absolute cursor-move touch-none ${outline(item.id)}`}
                      style={{
                        left: item.x * scale,
                        top: item.y * scale,
                        width: item.width * scale,
                        height: item.height * scale,
                      }}
                    />
                  )
                )}
            </div>
          )}

          <p className="text-center text-xs text-gray-500">
            กดที่ข้อความหรือรูปเพื่อเลือก ลากเพื่อย้ายตำแหน่ง
          </p>

          {/* กล่องแก้รายละเอียดของชิ้นที่เลือก */}
          {selected && selected.kind === 'text' && (
            <div className="space-y-3 rounded border bg-gray-50 p-3">
              <p className="text-sm font-medium">ข้อความ</p>
              <textarea
                value={selected.text}
                onChange={(e) => updateItem(selected.id, { text: e.target.value })}
                rows={3}
                className="w-full rounded border p-2"
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  ขนาดตัวอักษร: {selected.fontSize} pt
                </span>
                <input
                  type="range"
                  min={6}
                  max={120}
                  value={selected.fontSize}
                  onChange={(e) =>
                    updateItem(selected.id, { fontSize: parseInt(e.target.value, 10) })
                  }
                  className="w-full"
                />
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  สี
                  <input
                    type="color"
                    value={rgbToHex(selected.color)}
                    onChange={(e) =>
                      updateItem(selected.id, { color: hexToRgb(e.target.value) })
                    }
                    className="h-9 w-14 rounded border"
                  />
                </label>
                <button
                  onClick={() => updateItem(selected.id, { bold: !selected.bold })}
                  className={`rounded border px-3 py-1 font-bold ${
                    selected.bold ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => deleteItem(selected.id)}
                  className="ml-auto rounded border border-red-600 px-3 py-1 text-red-600"
                >
                  ลบ
                </button>
              </div>
            </div>
          )}

          {selected && selected.kind === 'image' && preview && (
            <div className="space-y-3 rounded border bg-gray-50 p-3">
              <p className="text-sm font-medium">รูปภาพ</p>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  ความกว้าง: {Math.round(selected.width)} pt
                </span>
                <input
                  type="range"
                  min={20}
                  max={Math.floor(preview.widthPt)}
                  value={selected.width}
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10)
                    // คงสัดส่วนเดิมของรูป
                    updateItem(selected.id, {
                      width: w,
                      height: (w * selected.height) / selected.width,
                    })
                  }}
                  className="w-full"
                />
              </label>
              <button
                onClick={() => deleteItem(selected.id)}
                className="rounded border border-red-600 px-3 py-1 text-red-600"
              >
                ลบรูปนี้
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={busy || items.length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
            >
              {busy ? 'กำลังบันทึก...' : 'บันทึกและดาวน์โหลด'}
            </button>
            <span className="text-sm text-gray-600">
              แก้ไขแล้ว {items.length} รายการ (หน้านี้ {pageItems.length})
            </span>
          </div>
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  )
}