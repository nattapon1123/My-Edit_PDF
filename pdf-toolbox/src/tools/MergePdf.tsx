import { useRef, useState } from 'react'
import FileDropzone from '../components/FileDropzone'
import PageCard from '../components/PageCard'
import { mergePages } from '../lib/mergePdf'
import { downloadBytes } from '../lib/download'
import { makeImageThumb } from '../lib/imageThumb'
import { renderThumbs } from '../lib/renderThumbs'
import type { PageItem } from '../lib/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const isPdf = (f: File) => f.type === 'application/pdf'
const isImage = (f: File) => IMAGE_TYPES.includes(f.type)

export default function MergePdf() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  // เก็บไฟล์ต้นฉบับไว้ใช้ตอนรวมจริง (ไม่ต้องอยู่ใน state เพราะไม่กระทบหน้าจอ)
  const filesRef = useRef<Map<string, File>>(new Map())
  const fileCountRef = useRef(0)

  // ต้องลากไกลอย่างน้อย 5px ถึงจะเริ่มลาก กันกดคลิกเฉยๆ แล้วเผลอลาก
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === active.id)
      const to = prev.findIndex((p) => p.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const rotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, rotation: ((p.rotation + 90) % 360) as PageItem['rotation'] }
          : p
      )
    )
  }

  const deletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id))
  }

  const addFiles = async (newFiles: File[]) => {
    const accepted = newFiles.filter((f) => isPdf(f) || isImage(f))
    if (accepted.length === 0) return

    setLoading(true)

    for (const file of accepted) {
      const fileId = crypto.randomUUID()
      const fileColor = fileCountRef.current++
      filesRef.current.set(fileId, file)

      try {
        setStatus(`กำลังอ่าน ${file.name}...`)

        if (isPdf(file)) {
          await renderThumbs(file, (p, total) => {
            const item: PageItem = {
              id: crypto.randomUUID(),
              fileId,
              fileName: file.name,
              fileColor,
              kind: 'pdf',
              pageIndex: p.pageIndex,
              thumb: p.thumb,
              rotation: 0,
            }
            setPages((prev) => [...prev, item])
            setStatus(`${file.name}: ${p.pageIndex + 1}/${total}`)
          })
        } else {
          const thumb = await makeImageThumb(file)
          const item: PageItem = {
            id: crypto.randomUUID(),
            fileId,
            fileName: file.name,
            fileColor,
            kind: 'image',
            pageIndex: 0,
            thumb,
            rotation: 0,
          }
          setPages((prev) => [...prev, item])
        }
      } catch (e) {
        console.error(e)
        setStatus(`อ่านไฟล์ ${file.name} ไม่ได้ ไฟล์อาจเสียหรือมีรหัสผ่าน`)
        filesRef.current.delete(fileId)
      }
    }

    setLoading(false)
    setStatus('')
  }

  const clearAll = () => {
    setPages([])
    filesRef.current.clear()
    fileCountRef.current = 0
  }

  const handleMerge = async () => {
    setMerging(true)
    setError('')
    try {
      const result = await mergePages(pages, filesRef.current)
      downloadBytes(result, 'merged.pdf')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'รวมไฟล์ไม่สำเร็จ')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">จัดการหน้า PDF</h1>
      <FileDropzone
        accept="application/pdf,image/jpeg,image/png,image/webp"
        multiple
        disabled={loading}
        compact={pages.length > 0}
        onFiles={addFiles}
      />

      {status && <p className="text-sm text-gray-600">{status}</p>}

      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-medium">ทั้งหมด {pages.length} หน้า</p>
            <button
              onClick={clearAll}
              disabled={loading || merging}
              className="text-sm text-red-600 disabled:opacity-40"
            >
              ล้างทั้งหมด
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {pages.map((item, i) => (
                  <PageCard
                    key={item.id}
                    item={item}
                    order={i + 1}
                    onRotate={rotatePage}
                    onDelete={deletePage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {error && <p className="text-red-600">{error}</p>}

          <button
            onClick={handleMerge}
            disabled={loading || merging}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {merging ? 'กำลังรวม...' : `รวมเป็น PDF (${pages.length} หน้า)`}
          </button>
        </>
      )}
    </div>
  )
}