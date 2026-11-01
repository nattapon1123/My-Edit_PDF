import { Link } from 'react-router-dom'

const tools = [
  {
    to: '/merge',
    title: 'จัดการหน้า PDF',
    desc: 'รวมไฟล์ จัดเรียง ลบ และหมุนหน้า ด้วยการลากวาง',
  },
  {
    to: '/split',
    title: 'ดึงหน้าด้วยเลขหน้า',
    desc: 'พิมพ์ช่วงหน้า เช่น 1-3, 5, 8-10 แล้วดึงออกมาเป็นไฟล์ใหม่',
  },
  {
    to: '/image',
    title: 'บีบอัด / ย่อ / แปลงรูป',
    desc: 'ลดขนาดไฟล์รูป ย่อขนาด และแปลงเป็น JPG, PNG, WebP',
  },
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