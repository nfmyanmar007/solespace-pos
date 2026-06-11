import React from 'react'
import { useSession } from '../context/SessionContext'

export default function POSHome() {
  const { session, logout } = useSession()

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">👟</div>
        <h1 className="text-white text-2xl font-bold mb-2">
          Welcome, {session?.staffName}!
        </h1>
        <p className="text-slate-400 mb-2">
          Role: <span className="text-white capitalize">{session?.role}</span>
        </p>
        <p className="text-slate-400 text-sm mb-6">
          POS home screen coming on Day 4
        </p>
        <button
          onClick={logout}
          className="bg-slate-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-slate-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
