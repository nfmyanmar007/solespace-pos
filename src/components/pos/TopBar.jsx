import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Store } from 'lucide-react'
import { useSession } from '../../context/SessionContext'

export default function TopBar({ title, subtitle, showBack, backTo }) {
  const navigate = useNavigate()
  const { session, logout } = useSession()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
      {showBack && (
        <button onClick={() => navigate(backTo || '/pos')} className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
      )}
      {!showBack && <span className="text-xl">👟</span>}
      <div className="flex-1">
        <p className="text-sm font-semibold leading-tight">{title || 'SoleSpace POS'}</p>
        <p className="text-xs text-slate-400 leading-tight">
          {subtitle || 'Downtown - ' + (session ? session.staffName : '')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 capitalize bg-slate-700 px-2 py-1 rounded-full">
          {session ? session.role : ''}
        </span>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
