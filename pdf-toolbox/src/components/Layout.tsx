import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'หน้าแรก' },
  { to: '/merge', label: 'รวม PDF' },
  { to: '/split', label: 'แยกหน้า' },
  { to: '/rotate', label: 'หมุนหน้า' },
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