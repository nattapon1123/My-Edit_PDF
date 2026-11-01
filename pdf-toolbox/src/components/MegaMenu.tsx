import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, type Tool } from '../lib/toolsData'

// รายการเครื่องมือหนึ่งแถว (ใช้ร่วมกันทั้งเดสก์ท็อปและมือถือ)
function ToolItem({ tool }: { tool: Tool }) {
  if (!tool.to) {
    return (
      <li className="flex items-center justify-between gap-2 py-1 text-sm text-gray-400">
        <span>{tool.title}</span>
        <span className="shrink-0 rounded bg-gray-100 px-1.5 text-[10px] text-gray-500">
          เร็วๆ นี้
        </span>
      </li>
    )
  }
  return (
    <li>
      <Link
        to={tool.to}
        className="block rounded py-1 text-sm text-gray-700 hover:text-blue-600"
      >
        {tool.title}
      </Link>
    </li>
  )
}

export default function MegaMenu() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null) // หมวดที่กางบนมือถือ
  const wrapRef = useRef<HTMLDivElement>(null)

  // กดนอกเมนู หรือกด Esc แล้วปิด
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      {/* ปุ่มเปิดเมนู: เดสก์ท็อปเป็นข้อความ มือถือเป็นสามขีด */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="เมนูเครื่องมือ"
        className="flex items-center gap-2 rounded border px-3 py-1.5 text-gray-700 hover:bg-gray-50"
      >
        <span className="text-lg leading-none">☰</span>
        <span className="hidden md:inline">เครื่องมือทั้งหมด</span>
      </button>

      {open && (
        <>
          {/* เดสก์ท็อป: แผงหล่นแสดงทุกหมวดเป็นคอลัมน์ */}
          <div className="absolute left-0 top-full z-50 mt-2 hidden w-[min(90vw,900px)] rounded-xl border bg-white p-6 shadow-lg md:block">
            <div className="grid grid-cols-3 gap-x-8 gap-y-6">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    {cat.name}
                  </h3>
                  <ul className="space-y-0.5">
                    {cat.tools.map((t) => (
                      <ToolItem key={t.title} tool={t} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* มือถือ: เมนูแนวตั้ง แต่ละหมวดพับ/กางได้ */}
          <div className="absolute left-0 top-full z-50 mt-2 max-h-[75vh] w-[85vw] max-w-sm overflow-y-auto rounded-xl border bg-white p-2 shadow-lg md:hidden">
            {categories.map((cat) => {
              const isOpen = expanded === cat.name
              return (
                <div key={cat.name} className="border-b last:border-b-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : cat.name)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-2 py-3 text-left font-medium"
                  >
                    {cat.name}
                    <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <ul className="space-y-0.5 px-4 pb-3">
                      {cat.tools.map((t) => (
                        <ToolItem key={t.title} tool={t} />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}