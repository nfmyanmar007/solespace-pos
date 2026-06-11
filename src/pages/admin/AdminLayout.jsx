import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, Package,
  Users, BarChart2, LogOut, Menu, X, Tag
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Transactions', icon: ShoppingBag,   path: '/admin/transactions' },
  { label: 'Products',   icon: Package,          path: '/admin/products' },
  { label: 'Inventory',  icon: Package,          path: '/admin/inventory' },
  { label: 'Customers',  icon: Users,            path: '/admin/customers' },
  { label: 'Discounts',  icon: Tag,              path: '/admin/discounts' },
  { label: 'Reports',    icon: BarChart2,         path: '/admin/reports' },
]

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem('admin_session')
    if (!s) { navigate('/admin'); return }
    setSession(JSON.parse(s))
  }, [])

  function handleLogout() {
    localStorage.removeItem('admin_session')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-52 bg-slate-800 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">👟</span>
            <div>
              <p className="text-white text-sm font-bold">SoleSpace</p>
              <p className="text-slate-400 text-xs">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Staff info + logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {session?.staffName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {session?.staffName || 'Admin'}
              </p>
              <p className="text-slate-400 text-xs capitalize">
                {session?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white text-sm transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-sm font-semibold text-gray-800 flex-1 capitalize">
            {location.pathname.split('/').pop()}
          </h1>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
