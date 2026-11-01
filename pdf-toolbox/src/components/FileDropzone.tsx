import { useRef, useState } from 'react'

type Props = {
  accept: string
  multiple?: boolean
  disabled?: boolean // ล็อกการเลือกไฟล์ (เช่นตอนกำลังโหลด)
  compact?: boolean  // แสดงเป็นแถบเล็ก
  onFiles: (files: File[]) => void
}

export default function FileDropzone({
  accept,
  multiple = false,
  disabled = false,
  compact = false,
  onFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (list: FileList | null) => {
    if (disabled) return
    if (list && list.length > 0) onFiles(Array.from(list))
  }

  const label = disabled
    ? 'กำลังโหลดไฟล์ กรุณารอสักครู่...'
    : compact
      ? '+ เพิ่มไฟล์ (ลากมาวางหรือคลิก)'
      : 'ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์'

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handle(e.dataTransfer.files)
      }}
      className={`rounded-xl border-2 border-dashed text-center transition ${
        compact ? 'p-3 text-sm' : 'p-10'
      } ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
          : dragging
            ? 'cursor-pointer border-blue-500 bg-blue-50'
            : 'cursor-pointer border-gray-300 hover:border-gray-400'
      }`}
    >
      <p className="text-gray-600">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          handle(e.target.files)
          e.target.value = '' // ให้เลือกไฟล์เดิมซ้ำได้
        }}
      />
    </div>
  )
}