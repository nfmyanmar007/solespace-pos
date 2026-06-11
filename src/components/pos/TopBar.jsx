import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Store } from 'lucide-react'
import { useSession } from '../../context/SessionContext'

export default function TopBar({ title, subtitle, showBack = false, backTo = '/pos' }) {
  const navigate = useNavigate()
  const { session, logout } = useSession()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
      {showBack && (
        <button
          onClick={() => navigate(backTo)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      {!showBack && (
        <span className="text-xl">👟</span>
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold leading-tight">
          {title || 'SoleSpace POS'}
        </p>
        <p className="text-xs text-slate-400 leading-tight">
          {subtitle || (
            <>
              <Store size={10} className="inline mr-1" />
              Downtown · {session?.staffName}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 capitalize bg-slate-700 px-2 py-1 rounded-full">
          {session?.role}
        </span>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
