import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'

export default function ChangePinPage() {
  const navigate = useNavigate()
  const { session } = useSession()

  const [step, setStep] = useState(1)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const activePin = step === 1 ? currentPin : step === 2 ? newPin : confirmPin

  const stepLabels = [
    'Enter your current PIN',
    'Enter your new PIN',
    'Confirm your new PIN',
  ]

  function handleKey(key) {
    setError('')
    if (key === 'DEL') {
      if (step === 1) setCurrentPin(function(p) { return p.slice(0, -1) })
      else if (step === 2) setNewPin(function(p) { return p.slice(0, -1) })
      else setConfirmPin(function(p) { return p.slice(0, -1) })
      return
    }
    if (key === 'CLR') {
      if (step === 1) setCurrentPin('')
      else if (step === 2) setNewPin('')
      else setConfirmPin('')
      return
    }
    if (activePin.length >= 4) return

    const next = activePin + key

    if (step === 1) {
      setCurrentPin(next)
      if (next.length === 4) verifyCurrentPin(next)
    } else if (step === 2) {
      setNewPin(next)
      if (next.length === 4) setStep(3)
    } else {
      setConfirmPin(next)
      if (next.length === 4) saveNewPin(next)
    }
  }

  async function verifyCurrentPin(pin) {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('staff')
        .select('id, pin_hash')
        .eq('id', session.staffId)
        .single()

      if (!data || data.pin_hash !== pin) {
        setError('Incorrect current PIN. Try again.')
        setCurrentPin('')
        setLoading(false)
        return
      }
      setStep(2)
    } catch (e) {
      setError('Error verifying PIN.')
      setCurrentPin('')
    }
    setLoading(false)
  }

  async function saveNewPin(confirmPinValue) {
    if (newPin !== confirmPinValue) {
      setError('PINs do not match. Try again.')
      setConfirmPin('')
      setNewPin('')
      setStep(2)
      return
    }
    if (newPin === currentPin) {
      setError('New PIN must be different from current PIN.')
      setConfirmPin('')
      setNewPin('')
      setStep(2)
      return
    }
    setLoading(true)
    try {
      const { error: updateErr } = await supabase
        .from('staff')
        .update({ pin_hash: newPin })
        .eq('id', session.staffId)

      if (updateErr) throw updateErr
      setSuccess(true)
    } catch (e) {
      setError('Failed to update PIN. Try again.')
      setConfirmPin('')
      setNewPin('')
      setStep(2)
    }
    setLoading(false)
  }

  const keys = ['1','2','3','4','5','6','7','8','9','DEL','0','CLR']

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-xs text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">PIN Updated!</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your PIN has been changed successfully.
          </p>
          <button
            onClick={function() { navigate('/pos') }}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm"
          >
            Back to POS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">

      <div className="w-full max-w-xs">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={function() { navigate('/pos') }}
            className="text-slate-400 hover:text-white p-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">Change PIN</h1>
            <p className="text-slate-400 text-xs">
              {session ? session.staffName : ''}
            </p>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          {[1, 2, 3].map(function(s) {
            return (
              <div
                key={s}
                className={
                  'flex-1 h-1 rounded-full mx-1 transition-all ' +
                  (step >= s ? 'bg-white' : 'bg-slate-700')
                }
              />
            )
          })}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-2xl">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1 text-center">
            STEP {step} OF 3
          </p>
          <p className="text-sm font-medium text-gray-700 text-center mb-4">
            {stepLabels[step - 1]}
          </p>

          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(function(i) {
              return (
                <div
                  key={i}
                  className={
                    'w-3 h-3 rounded-full border-2 transition-all ' +
                    (i < activePin.length
                      ? 'bg-slate-800 border-slate-800'
                      : 'border-gray-300')
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

          {loading ? (
            <div className="text-center py-4 text-sm text-gray-400">
              Verifying...
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {keys.map(function(k) {
                return (
                  <button
                    key={k}
                    onClick={function() { handleKey(k) }}
                    className={
                      'h-12 rounded-xl font-semibold transition-all active:scale-95 ' +
                      (k === 'DEL' || k === 'CLR'
                        ? 'bg-gray-100 text-gray-500 text-sm'
                        : 'bg-gray-50 border border-gray-200 text-gray-800 text-lg hover:bg-gray-100')
                    }
                  >
                    {k}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          PIN must be 4 digits
        </p>
      </div>
    </div>
  )
}
