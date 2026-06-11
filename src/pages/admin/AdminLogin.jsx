import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem('admin_session')
      if (s) navigate('/admin-dashboard', { replace: true })
    } catch {}
  }, [])

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','⌫','0','✕']

  function handleKey(key) {
    if (key === '⌫') { setPin(p => p.slice(0,-1)); setError('') }
    else if (key === '✕') { setPin(''); setError('') }
    else if (pin.length < 4) {
      const newPin = pin + key
      setPin(newPin)
      setError('')
      if (newPin.length === 4) verifyPin(newPin)
    }
  }

  async function verifyPin(pinToCheck) {
    setLoading(true)
    try {
      const { data, error: dbErr } = await supabase
        .from('staff')
        .select('*')
        .eq('pin_hash', pinToCheck)
        .in('role', ['admin', 'manager'])
        .eq('is_active', true)
        .single()

      if (dbErr || !data) {
        setError('Invalid PIN or insufficient permissions')
        setPin('')
        setLoading(false)
        return
      }

      localStorage.setItem('admin_session', JSON.stringify({
        staffId:   data.id,
        staffName: data.full_name,
        role:      data.role,
        storeId:   data.store_id,
      }))

      setTimeout(() => {
        navigate('/admin-dashboard', { replace: true })
      }, 100)

    } catch {
      setError('Login failed. Try again.')
      setPin('')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">👟</div>
          <h1 className="text-white text-xl font-bold">SoleSpace Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Manager / Admin access only</p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-5">
            <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4 text-center">
              ENTER YOUR PIN
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all
                  ${i < pin.length
                    ? 'bg-slate-800 border-slate-800 scale-110'
                    : 'border-gray-300'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-red-600 text-xs text-center">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {numpadKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => !loading && handleKey(key)}
                  disabled={loading}
                  className={`h-12 rounded-xl font-semibold text-lg transition-all active:scale-95
                    ${key === '⌫' || key === '✕'
                      ? 'bg-gray-100 text-gray-500 text-sm'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading && key === '0'
                    ? <Spinner size="sm" color="gray" />
                    : key
                  }
                </button>
              ))}
            </div>

            <p className="text-center text-gray-400 text-xs mt-4">
              Admin: 1234 · Manager: 5678
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
