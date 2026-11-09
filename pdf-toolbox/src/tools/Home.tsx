import { Link } from 'react-router-dom'
import { categories } from '../lib/toolsData'

// สีประจำแต่ละหมวด วนไปตามลำดับ
const accents = [
  { title: 'text-sky-700', border: 'border-l-sky-400', hover: 'hover:border-sky-300', tile: 'bg-sky-50' },
  { title: 'text-emerald-700', border: 'border-l-emerald-400', hover: 'hover:border-emerald-300', tile: 'bg-emerald-50' },
  { title: 'text-amber-700', border: 'border-l-amber-400', hover: 'hover:border-amber-300', tile: 'bg-amber-50' },
  { title: 'text-violet-700', border: 'border-l-violet-400', hover: 'hover:border-violet-300', tile: 'bg-violet-50' },
  { title: 'text-rose-700', border: 'border-l-rose-400', hover: 'hover:border-rose-300', tile: 'bg-rose-50' },
]

// ไอคอนอีโมจิของแต่ละเครื่องมือ (key คือชื่อเครื่องมือ)
const icons: Record<string, string> = {
  'จัดการหน้า PDF': '🗂️',
  'ดึงหน้าด้วยเลขหน้า': '✂️',
  'สแกนเป็น PDF': '📷',
  'บีบอัด / ย่อ / แปลงรูป': '🖼️',
  'บีบอัด PDF': '🗜️',
  'ซ่อม PDF': '🔧',
  'OCR PDF': '🔍',
  'JPG เป็น PDF': '🌄',
  'WORD เป็น PDF': '📝',
  'POWERPOINT เป็น PDF': '📊',
  'EXCEL เป็น PDF': '📈',
  'HTML เป็น PDF': '🌐',
  'PDF เป็นรูป': '🎞️',
  'PDF เป็น WORD': '📝',
  'PDF เป็น POWERPOINT': '📊',
  'PDF เป็น EXCEL': '📈',
  'PDF เป็น PDF/A': '🗄️',
  'หมุน PDF': '🔄',
  'ใส่หมายเลขหน้า': '🔢',
  'ใส่ลายน้ำ': '💧',
  'ครอบตัด PDF': '📐',
  'แก้ไข PDF': '✏️',
}

function Icon({ name, tile }: { name: string; tile: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ${tile}`}
    >
      {icons[name] ?? '📄'}
    </span>
  )
}

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="mb-1 text-3xl font-bold text-indigo-700">PDF Toolbox</h1>
        <p className="text-gray-600">
          ประมวลผลในเบราว์เซอร์ ไฟล์ไม่ถูกอัปโหลดไปไหน
        </p>
      </div>

      {categories.map((cat, i) => {
        const accent = accents[i % accents.length]
        return (
          <section key={cat.name}>
            <h2 className={`mb-3 text-sm font-bold uppercase tracking-wide ${accent.title}`}>
              {cat.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {cat.tools.map((t) =>
                t.to && t.status !== 'maintenance' ? (
                  <Link
                    key={t.title}
                    to={t.to}
                    className={`flex items-center gap-3 rounded-xl border border-l-4 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${accent.border} ${accent.hover}`}
                  >
                    <Icon name={t.title} tile={accent.tile} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{t.title}</h3>
                      <p className="text-sm text-gray-600">{t.desc}</p>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={t.title}
                    className={`flex items-center gap-3 rounded-xl border p-4 ${
                      t.status === 'maintenance'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-dashed bg-white opacity-60'
                    }`}
                  >
                    <Icon name={t.title} tile={t.status === 'maintenance' ? 'bg-orange-100' : 'bg-gray-100'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-semibold ${t.status === 'maintenance' ? 'text-gray-800' : 'text-gray-500'}`}>
                          {t.title}
                        </h3>
                        <span className={`shrink-0 rounded px-1.5 text-[10px] ${
                          t.status === 'maintenance'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {t.status === 'maintenance' ? 'ปิดปรับปรุง' : 'เร็วๆ นี้'}
                        </span>
                      </div>
                      <p className={`text-sm ${t.status === 'maintenance' ? 'text-gray-600' : 'text-gray-500'}`}>
                        {t.desc}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}