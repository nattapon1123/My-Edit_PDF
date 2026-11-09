import { Link, Outlet, useLocation } from 'react-router-dom'
import MegaMenu from './MegaMenu'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-indigo-500 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-3">
          <MegaMenu key={location.pathname} />
          <Link to="/" className="text-lg font-bold text-indigo-700">
            PDF Toolbox
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  )
}