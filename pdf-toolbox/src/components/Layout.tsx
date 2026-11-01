import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'หน้าแรก' },
  { to: '/merge', label: 'จัดการหน้า PDF' },
  { to: '/split', label: 'ดึงหน้าด้วยเลขหน้า' },
  { to: '/image', label: 'บีบอัด/แปลงรูป' },
]

export default function Layout() {
  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 border-b px-6 py-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              isActive ? 'font-bold text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}