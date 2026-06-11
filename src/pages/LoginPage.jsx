import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import Spinner from '../components/ui/Spinner'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'
const PIN_LENGTH = 4

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, session } = useSession()

  const [store, setStore] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const path = window.location.pathname
    if (session && path.indexOf('admin') === -1) navigate('/pos')
  }, [session, navigate])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', STORE_ID)
          .single()
        setStore(storeData)

        const { data: staffData } = await supabase
          .from('staff')
          .select('*')
          .eq('store_id', STORE_ID)
          .eq('is_active', true)
          .order('full_name')
        setStaffList(staffData || [])
      } catch (err) {
        setError('Could not load store data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function handleNumber(num) {
    if (pin.length >= PIN_LENGTH) return
    setError('')
    setPin((p) => p + num)
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1))
    setError('')
  }

  function handleClear() {
    setPin('')
    setError('')
  }

  useEffect(() => {
    if (pin.length === PIN_LENGTH && selectedStaff) {
      verifyPin()
    }
  }, [pin])

  async function verifyPin() {
    if (!selectedStaff) {
      setError('Please select a staff member first.')
      setPin('')
      return
    }
    setVerifying(true)
    try {
      const { data, error: dbError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', selectedStaff.id)
        .eq('pin_hash', pin)
        .eq('is_active', true)
        .single()

      if (dbError || !data) {
        setError('Incorrect PIN. Please try again.')
        setPin('')
        return
      }

      await supabase
        .from('staff')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id)

      login(data)
      navigate('/pos')
    } catch (err) {
      setError('Login failed. Please try again.')
      setPin('')
    } finally {
      setVerifying(false)
    }
  }

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','⌫','0','✕']

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" color="white" />
          <p className="text-slate-400 mt-4 text-sm">Loading SoleSpace POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">👟</div>
          <h1 className="text-white text-xl font-bold">
            {store ? store.name : 'SoleSpace POS'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {store ? store.city : ''} · Register 1
          </p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 tracking-widest mb-3">
              SELECT STAFF MEMBER
            </p>
            {staffList.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-2">
                No staff found for this store.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {staffList.map((staff, index) => {
                  const colors = AVATAR_COLORS[index % AVATAR_COLORS.length]
                  const isSelected = selectedStaff && selectedStaff.id === staff.id
                  return (
                    <button
                      key={staff.id}
                      onClick={() => {
                        setSelectedStaff(staff)
                        setPin('')
                        setError('')
                      }}
                      className={[
                        'flex flex-col items-center p-2 rounded-xl border-2 transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      ].join(' ')}
                    >
                      <div className={[
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        'text-sm font-bold mb-1',
                        colors.bg, colors.text
                      ].join(' ')}>
                        {getInitials(staff.full_name)}
                      </div>
                      <span className="text-xs font-medium text-gray-800 text-center leading-tight">
                        {staff.full_name.split(' ')[0]}
                      </span>
                      <span className="text-xs text-gray-400 capitalize mt-0.5">
                        {staff.role}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 tracking-widest mb-3">
              {selectedStaff ? 'ENTER PIN' : 'SELECT STAFF THEN ENTER PIN'}
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    'w-3 h-3 rounded-full border-2 transition-all duration-150',
                    i < pin.length
                      ? 'bg-slate-800 border-slate-800 scale-110'
                      : 'border-gray-300 bg-transparent'
                  ].join(' ')}
                />
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-red-600 text-xs text-center">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {numpadKeys.map((key) => {
                const isBackspace = key === '⌫'
                const isClear = key === '✕'
                const isAction = isBackspace || isClear
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isBackspace) handleBackspace()
                      else if (isClear) handleClear()
                      else handleNumber(key)
                    }}
                    disabled={verifying}
                    className={[
                      'h-12 rounded-xl font-semibold text-lg transition-all',
                      'active:scale-95 disabled:opacity-50',
                      isAction
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200'
                    ].join(' ')}
                  >
                    {key}
                  </button>
                )
              })}
            </div>

            <button
              onClick={verifyPin}
              disabled={pin.length < PIN_LENGTH || !selectedStaff || verifying}
              className={[
                'w-full mt-4 py-3 rounded-xl font-semibold text-sm',
                'bg-slate-800 text-white transition-all',
                'hover:bg-slate-700 active:scale-98',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              ].join(' ')}
            >
              {verifying ? (
                <><Spinner size="sm" color="white" /><span>Verifying...</span></>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          SoleSpace POS v1.0
        </p>
      </div>
    </div>
  )
}
