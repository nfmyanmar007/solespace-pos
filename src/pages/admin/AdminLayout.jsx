import React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, Package, Users, BarChart2, LogOut, Menu, Box, X } from 'lucide-react'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
  { label: 'Transactions', icon: ShoppingBag, path: '/admin-transactions' },
  { label: 'Products', icon: Package, path: '/admin-products' },
  { label: 'Inventory', icon: Box, path: '/admin-inventory' },
  { label: 'Staff', icon: Users, path: '/admin-staff' },
  { label: 'Customers', icon: Users, path: '/admin-customers' },
  { label: 'Reports', icon: BarChart2, path: '/admin-reports' },
]

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(function() {
    try {
      const s = localStorage.getItem('admin_session')
      if (!s) { navigate('/admin-login'); return }
      setSession(JSON.parse(s))
    } catch (e) {
      navigate('/admin-login')
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('admin_session')
    navigate('/admin-login')
  }

  const pageTitle = (NAV.find(function(n) { return n.path === location.pathname }) || {}).label || 'Admin'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 flex flex-col transform transition-transform duration-200 ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0') +
        ' lg:relative lg:w-52'
      }>
        <div className="px-4 py-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👟</span>
            <div>
              <p className="text-white text-sm font-bold">SoleSpace</p>
              <p className="text-slate-400 text-xs">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={function() { setSidebarOpen(false) }}
            className="lg:hidden text-slate-400 p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map(function(item) {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={function() { setSidebarOpen(false) }}
                className={
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ' +
                  (active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white')
                }
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {session && session.staffName ? session.staffName.charAt(0) : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {session ? session.staffName : 'Admin'}
              </p>
              <p className="text-slate-400 text-xs capitalize">
                {session ? session.role : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white text-sm"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={function() { setSidebarOpen(false) }}
        />
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-3 lg:px-6 sticky top-0 z-30">
          <button
            onClick={function() { setSidebarOpen(true) }}
            className="lg:hidden text-gray-500 p-1"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-sm font-semibold text-gray-800 flex-1 truncate">{pageTitle}</h1>
        </header>
        <main className="flex-1 p-3 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
