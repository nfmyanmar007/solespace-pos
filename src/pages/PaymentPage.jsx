import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useSession } from '../context/SessionContext'
import { saveTransaction } from '../lib/transactions'
import { formatMMK } from '../lib/currency'
import Spinner from '../components/ui/Spinner'

// Quick cash buttons in MMK
const CASH_SHORTCUTS = [1000, 5000, 10000, 20000, 50000, 100000, 200000, 500000]

export default function PaymentPage() {
  const navigate = useNavigate()
  const { items, total, subtotal, clearCart } = useCart()
  const { session } = useSession()

  const [method, setMethod] = useState('cash')   // 'cash' | 'card'
  const [cashInput, setCashInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)      // success result
  const [error, setError] = useState('')

  // Redirect if cart is empty
  if (items.length === 0 && !result) {
    navigate('/pos')
    return null
  }

  const cashTendered = parseFloat(cashInput) || 0
  const change = cashTendered - total
  const cashValid = cashTendered >= total

  // Numpad input
  function handleNumpad(val) {
    if (val === '⌫') {
      setCashInput((p) => p.slice(0, -1))
    } else if (val === '000') {
      setCashInput((p) => (p === '' ? '' : p + '000'))
    } else {
      setCashInput((p) => p + val)
    }
  }

  function handleShortcut(amount) {
    setCashInput(String(amount))
  }

  async function handleCharge() {
    if (method === 'cash' && !cashValid) return
    setProcessing(true)
    setError('')

    const res = await saveTransaction({
      staffId:       session.staffId,
      items,
      subtotal,
      discountAmt:   0,
      total,
      paymentMethod: method,
      cashTendered:  method === 'cash' ? cashTendered : null,
      changeGiven:   method === 'cash' ? change : null,
    })

    setProcessing(false)

    if (res.success) {
      setResult(res)
      clearCart()
    } else {
      setError('Payment failed: ' + res.error)
    }
  }

  // ── Success screen ──
if (result) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Sale Complete!</h2>
        <p className="text-gray-500 text-sm mb-4">{result.refNumber}</p>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total charged</span>
            <span className="font-bold text-gray-900">{formatMMK(total)}</span>
          </div>
          {method === 'cash' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cash received</span>
                <span className="text-gray-700">{formatMMK(cashTendered)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500">Change</span>
                <span className="font-bold text-green-600">{formatMMK(change)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span className="text-gray-500">Payment</span>
            <span className="capitalize text-gray-700">{method}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => navigate(`/pos/receipt/${result.transactionId}`)}
            className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition-colors"
          >
            View / Print Receipt
          </button>
          <button
            onClick={() => { setResult(null); navigate('/pos') }}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}

  // ── Payment screen ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/pos')}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-sm font-semibold">Payment</p>
          <p className="text-xs text-slate-400">{items.length} item{items.length > 1 ? 's' : ''} · {session?.staffName}</p>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden max-w-4xl mx-auto w-full">

        {/* Left: Order summary + method */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Order Summary</p>
            </div>
            <div className="px-4 py-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <div key={item.variantId} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{item.productName}</p>
                    <p className="text-xs text-gray-400">Sz {item.size} · {item.color} × {item.qty}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-900">{formatMMK(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-slate-800">{formatMMK(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 tracking-widest mb-3">
              PAYMENT METHOD
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod('cash')}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${method === 'cash'
                    ? 'border-slate-800 bg-slate-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Banknote size={20} className={method === 'cash' ? 'text-slate-800' : 'text-gray-400'} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${method === 'cash' ? 'text-slate-800' : 'text-gray-600'}`}>
                    Cash
                  </p>
                  <p className="text-xs text-gray-400">MMK notes</p>
                </div>
              </button>
              <button
                onClick={() => setMethod('card')}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${method === 'card'
                    ? 'border-slate-800 bg-slate-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <CreditCard size={20} className={method === 'card' ? 'text-slate-800' : 'text-gray-400'} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${method === 'card' ? 'text-slate-800' : 'text-gray-600'}`}>
                    Card
                  </p>
                  <p className="text-xs text-gray-400">Debit / Credit</p>
                </div>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Right: Cash input or card confirm */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden h-full flex flex-col">

            {method === 'cash' ? (
              <>
                {/* Cash display */}
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Amount due</p>
                  <p className="text-lg font-bold text-gray-900">{formatMMK(total)}</p>
                </div>

                {/* Cash tendered display */}
                <div className="p-4 border-b border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Cash received</p>
                  <div className="text-2xl font-bold text-slate-800 min-h-8">
                    {cashInput ? formatMMK(cashTendered) : <span className="text-gray-300">0</span>}
                  </div>
                  {cashInput && cashValid && (
                    <div className="mt-2 flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-green-700 font-medium">Change</span>
                      <span className="text-sm font-bold text-green-700">{formatMMK(change)}</span>
                    </div>
                  )}
                  {cashInput && !cashValid && (
                    <div className="mt-2 bg-red-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-red-600">
                        Need {formatMMK(total - cashTendered)} more
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick shortcuts */}
                <div className="px-3 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Quick amounts</p>
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {CASH_SHORTCUTS.filter(a => a >= total * 0.5).slice(0, 4).map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleShortcut(amt)}
                        className="py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        {amt >= 1000 ? (amt/1000)+'K' : amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numpad */}
                <div className="px-3 pb-3 flex-1">
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleNumpad(k)}
                        className={`
                          h-10 rounded-xl text-sm font-semibold transition-all active:scale-95
                          ${k === '⌫'
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-gray-50 border border-gray-200 text-gray-800 hover:bg-gray-100'
                          }
                        `}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Card payment */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard size={28} className="text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Card Payment</p>
                <p className="text-xs text-gray-400 mb-4">
                  Present card to terminal
                </p>
                <div className="bg-slate-50 rounded-xl px-4 py-3 w-full mb-4">
                  <p className="text-xs text-gray-400">Amount to charge</p>
                  <p className="text-xl font-bold text-slate-800">{formatMMK(total)}</p>
                </div>
                <p className="text-xs text-gray-400">
                  Click confirm when card is approved
                </p>
              </div>
            )}

            {/* Charge button */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={handleCharge}
                disabled={processing || (method === 'cash' && !cashValid)}
                className="
                  w-full py-3.5 rounded-xl font-bold text-sm
                  bg-slate-800 text-white
                  hover:bg-slate-700 active:scale-98
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all flex items-center justify-center gap-2
                "
              >
                {processing ? (
                  <>
                    <Spinner size="sm" color="white" />
                    <span>Processing...</span>
                  </>
                ) : method === 'cash' ? (
                  cashValid
                    ? `Confirm ${formatMMK(total)}`
                    : `Enter cash amount`
                ) : (
                  `Confirm Card ${formatMMK(total)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
