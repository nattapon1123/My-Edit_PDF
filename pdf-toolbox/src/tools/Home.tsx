import { Link } from 'react-router-dom'
import { categories } from '../lib/toolsData'

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="mb-1 text-3xl font-bold">PDF Toolbox</h1>
        <p className="text-gray-600">
          ประมวลผลในเบราว์เซอร์ ไฟล์ไม่ถูกอัปโหลดไปไหน
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat.name}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            {cat.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {cat.tools.map((t) =>
              t.to && t.status !== 'maintenance' ? (
                <Link
                  key={t.title}
                  to={t.to}
                  className="rounded-xl border p-4 transition hover:shadow"
                >
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="text-sm text-gray-600">{t.desc}</p>
                </Link>
              ) : (
                <div
                  key={t.title}
                  className={`rounded-xl border p-4 ${
                    t.status === 'maintenance'
                      ? 'border-orange-200 bg-orange-50/50'
                      : 'border-dashed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-semibold ${t.status === 'maintenance' ? 'text-gray-700' : 'text-gray-500'}`}>
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
              )
            )}
          </div>
        </section>
      ))}
    </div>
  )
}