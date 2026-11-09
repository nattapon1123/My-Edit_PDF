import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, type Tool } from '../lib/toolsData'

// สีประจำแต่ละหมวด (ให้ตรงกับสีในหน้าแรก)
const accents = [
  { title: 'text-sky-700', tile: 'bg-sky-50', dot: 'bg-sky-400' },
  { title: 'text-emerald-700', tile: 'bg-emerald-50', dot: 'bg-emerald-400' },
  { title: 'text-amber-700', tile: 'bg-amber-50', dot: 'bg-amber-400' },
  { title: 'text-violet-700', tile: 'bg-violet-50', dot: 'bg-violet-400' },
  { title: 'text-rose-700', tile: 'bg-rose-50', dot: 'bg-rose-400' },
]

// รายการเครื่องมือหนึ่งแถว (ใช้ร่วมกันทั้งเดสก์ท็อปและมือถือ)
function ToolItem({ tool, dot }: { tool: Tool; dot: string }) {
  if (!tool.to || tool.status === 'maintenance') {
    return (
      <li className="flex items-center justify-between gap-2 px-2 py-1 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
          {tool.title}
        </span>
        <span className={`shrink-0 rounded px-1.5 text-[10px] ${
          tool.status === 'maintenance'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {tool.status === 'maintenance' ? 'ปิดปรับปรุง' : 'เร็วๆ นี้'}
        </span>
      </li>
    )
  }
  return (
    <li>
      <Link
        to={tool.to}
        className="flex items-center gap-2 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
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
        className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-700 hover:bg-indigo-100"
      >
        <span className="text-lg leading-none">☰</span>
        <span className="hidden md:inline">เครื่องมือทั้งหมด</span>
      </button>

      {open && (
        <>
          {/* เดสก์ท็อป: แผงหล่นแสดงทุกหมวดเป็นคอลัมน์ */}
          <div className="absolute left-0 top-full z-50 mt-2 hidden w-[min(90vw,900px)] rounded-xl border bg-white p-6 shadow-lg md:block">
            <div className="grid grid-cols-3 gap-x-6 gap-y-6">
              {categories.map((cat, i) => {
                const accent = accents[i % accents.length]
                return (
                  <div key={cat.name}>
                    <h3 className={`mb-2 rounded-lg px-3 py-1.5 text-sm font-bold ${accent.tile} ${accent.title}`}>
                      {cat.name}
                    </h3>
                    <ul className="space-y-0.5">
                      {cat.tools.map((t) => (
                        <ToolItem key={t.title} tool={t} dot={accent.dot} />
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>

          {/* มือถือ: เมนูแนวตั้ง แต่ละหมวดพับ/กางได้ */}
          <div className="absolute left-0 top-full z-50 mt-2 max-h-[75vh] w-[85vw] max-w-sm overflow-y-auto rounded-xl border bg-white p-2 shadow-lg md:hidden">
            {categories.map((cat, i) => {
              const accent = accents[i % accents.length]
              const isOpen = expanded === cat.name
              return (
                <div key={cat.name} className="border-b last:border-b-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : cat.name)}
                    aria-expanded={isOpen}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left font-bold ${accent.title} ${
                      isOpen ? accent.tile : ''
                    }`}
                  >
                    {cat.name}
                    <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <ul className="space-y-0.5 px-2 pb-3">
                      {cat.tools.map((t) => (
                        <ToolItem key={t.title} tool={t} dot={accent.dot} />
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