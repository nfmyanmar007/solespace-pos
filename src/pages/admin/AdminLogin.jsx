import React from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    localStorage.removeItem('pos_session')
    const s = localStorage.getItem('admin_session')
    if (s) navigate('/admin-dashboard', { replace: true })
  }, [])

  function handleKey(key) {
    if (key === 'DEL') {
      setPin(function(p) { return p.slice(0, -1) })
      setError('')
      return
    }
    if (key === 'CLR') {
      setPin('')
      setError('')
      return
    }
    if (pin.length >= 4) return
    const next = pin + key
    setPin(next)
    setError('')
    if (next.length === 4) doLogin(next)
  }

  async function doLogin(p) {
    setLoading(true)
    try {
      const result = await supabase
        .from('staff')
        .select('*')
        .eq('pin_hash', p)
        .in('role', ['admin', 'manager'])
        .eq('is_active', true)
        .single()
      const data = result.data
      if (!data) {
        setError('Wrong PIN. Try again.')
        setPin('')
        setLoading(false)
        return
      }
      localStorage.setItem('admin_session', JSON.stringify({
        staffId: data.id,
        staffName: data.full_name,
        role: data.role,
        storeId: data.store_id,
      }))
      navigate('/admin-dashboard', { replace: true })
    } catch (e) {
      setError('Login failed.')
      setPin('')
      setLoading(false)
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','DEL','0','CLR']

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs">

        <div className="text-center mb-6">
          <div className="text-3xl mb-2">👟</div>
          <h1 className="text-white text-xl font-bold">SoleSpace Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Admin and Manager access</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-2xl">

          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4 text-center">
            ENTER YOUR PIN
          </p>

          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(function(i) {
              return (
                <div
                  key={i}
                  className={
                    i < pin.length
                      ? 'w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-800'
                      : 'w-3 h-3 rounded-full border-2 border-gray-300'
                  }
                />
              )
            })}
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              <p className="text-red-600 text-xs text-center">{error}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {keys.map(function(k) {
              const isAction = k === 'DEL' || k === 'CLR'
              return (
                <button
                  key={k}
                  onClick={function() { handleKey(k) }}
                  disabled={loading}
                  className={
                    isAction
                      ? 'h-12 rounded-xl font-semibold text-sm bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'h-12 rounded-xl font-semibold text-lg bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100'
                  }
                >
                  {k}
                </button>
              )
            })}
          </div>

          <p className="text-center text-gray-400 text-xs mt-4">
            Admin PIN: 1234 / Manager PIN: 5678
          </p>

        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-slate-500 text-xs underline">
            Back to POS
          </a>
        </div>

      </div>
    </div>
  )
}
