import { Link } from 'react-router-dom'

const tools = [
  { to: '/merge', title: 'รวม PDF', desc: 'รวมหลายไฟล์เป็นไฟล์เดียว' },
  { to: '/split', title: 'แยกหน้า PDF', desc: 'ดึงเฉพาะหน้าที่ต้องการ' },
  { to: '/rotate', title: 'หมุนหน้า PDF', desc: 'หมุนหน้าที่วางผิดทิศ' },
]

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-3xl font-bold">PDF Toolbox</h1>
      <p className="mb-6 text-gray-600">ประมวลผลในเบราว์เซอร์ ไฟล์ไม่ถูกอัปโหลดไปไหน</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-xl border p-4 transition hover:shadow"
          >
            <h2 className="font-semibold">{t.title}</h2>
            <p className="text-sm text-gray-600">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}