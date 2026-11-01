import { Link, Outlet, useLocation } from 'react-router-dom'
import MegaMenu from './MegaMenu'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b px-6 py-3">
        <MegaMenu key={location.pathname} />
        <Link to="/" className="text-lg font-bold">
          PDF Toolbox
        </Link>
      </header>
      <Outlet />
    </div>
  )
}