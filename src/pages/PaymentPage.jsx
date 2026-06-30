import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Banknote, CreditCard, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useSession } from '../context/SessionContext'
import { useSale } from '../context/SaleContext'
import { saveTransaction } from '../lib/transactions'
import { formatMMK } from '../lib/currency'
import Spinner from '../components/ui/Spinner'

const CASH_SHORTCUTS = [1000, 5000, 10000, 20000, 50000, 100000, 200000, 500000]

export default function PaymentPage() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()
  const { session } = useSession()
  const { customer, discount, clearSale } = useSale()

  const [method, setMethod] = useState('cash')
  const [cashInput, setCashInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)

  const discountAmt = discount ? discount.calculatedAmt : 0
  const total = Math.max(0, subtotal - discountAmt)

  const cashTendered = parseFloat(cashInput) || 0
  const change = cashTendered - total
  const cashValid = cashTendered >= total

  if (items.length === 0 && !result) {
    navigate('/pos')
    return null
  }

  function handleNumpad(val) {
    if (val === 'back') {
      setCashInput(function(p) { return p.slice(0, -1) })
    } else if (val === '000') {
      setCashInput(function(p) { return p === '' ? '' : p + '000' })
    } else {
      setCashInput(function(p) { return p + val })
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
      staffId: session.staffId,
      customerId: customer ? customer.id : null,
      items: items,
      subtotal: subtotal,
      discountAmt: discountAmt,
      total: total,
      paymentMethod: method,
      cashTendered: method === 'cash' ? cashTendered : null,
      changeGiven: method === 'cash' ? change : null,
    })

    setProcessing(false)

    if (res.success) {
      setResult(res)
      clearCart()
      clearSale()
    } else {
      setError('Payment failed: ' + res.error)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sale complete</h2>
          <p className="text-gray-500 text-sm mb-4">{result.refNumber}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total charged</span>
              <span className="font-bold text-gray-900">{formatMMK(total)}</span>
            </div>
            {discountAmt > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount saved</span>
                <span className="text-green-600 font-medium">- {formatMMK(discountAmt)}</span>
              </div>
            ) : null}
            {customer ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="text-gray-700">{customer.full_name}</span>
              </div>
            ) : null}
            {method === 'cash' ? (
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
            ) : null}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-500">Payment</span>
              <span className="capitalize text-gray-700">{method}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={function() { navigate('/pos/receipt/' + result.transactionId) }}
              className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-semibold text-sm"
            >
              View receipt
            </button>
            <button
              onClick={function() { setResult(null); navigate('/pos') }}
              className="w-full py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm"
            >
              New sale
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <header className="bg-slate-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0 sticky top-0 z-30">
        <button onClick={function() { navigate('/pos') }} className="text-slate-300 p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Payment</p>
          <p className="text-xs text-slate-400 truncate">
            {items.length} item{items.length > 1 ? 's' : ''}
            {customer ? ' — ' + customer.full_name : ''}
          </p>
        </div>
      </header>

      <button
        onClick={function() { setSummaryOpen(!summaryOpen) }}
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Order total</span>
          {summaryOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
        <span className="text-base font-bold text-gray-900">{formatMMK(total)}</span>
      </button>

      {summaryOpen ? (
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
          {items.map(function(item) {
            return (
              <div key={item.variantId} className="flex justify-between items-center py-1.5">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">Sz {item.size} — {item.color} × {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-gray-900 flex-shrink-0">{formatMMK(item.price * item.qty)}</p>
              </div>
            )
          })}
          <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>{formatMMK(subtotal)}</span>
            </div>
            {discountAmt > 0 ? (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount ({discount.code})</span>
                <span>- {formatMMK(discountAmt)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="px-4 pt-3 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={function() { setMethod('cash') }}
            className={
              'flex items-center justify-center gap-2 py-3 rounded-xl border-2 ' +
              (method === 'cash' ? 'border-slate-800 bg-slate-50' : 'border-gray-200')
            }
          >
            <Banknote size={18} className={method === 'cash' ? 'text-slate-800' : 'text-gray-400'} />
            <span className={'text-sm font-semibold ' + (method === 'cash' ? 'text-slate-800' : 'text-gray-500')}>
              Cash
            </span>
          </button>
          <button
            onClick={function() { setMethod('card') }}
            className={
              'flex items-center justify-center gap-2 py-3 rounded-xl border-2 ' +
              (method === 'card' ? 'border-slate-800 bg-slate-50' : 'border-gray-200')
            }
          >
            <CreditCard size={18} className={method === 'card' ? 'text-slate-800' : 'text-gray-400'} />
            <span className={'text-sm font-semibold ' + (method === 'card' ? 'text-slate-800' : 'text-gray-500')}>
              Card
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex-shrink-0">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col px-4 pt-4 pb-4">
        {method === 'cash' ? (
          <>
            <div className="text-center mb-3">
              <p className="text-xs text-gray-400">Cash received</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {cashInput ? formatMMK(cashTendered) : <span className="text-gray-300">0</span>}
              </p>
              {cashInput && cashValid ? (
                <div className="mt-2 inline-flex items-center gap-2 bg-green-50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-green-700 font-medium">Change</span>
                  <span className="text-sm font-bold text-green-700">{formatMMK(change)}</span>
                </div>
              ) : null}
              {cashInput && !cashValid ? (
                <div className="mt-2 inline-block bg-red-50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-red-600">Need {formatMMK(total - cashTendered)} more</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {CASH_SHORTCUTS.filter(function(a) { return a >= total * 0.5 }).slice(0, 4).map(function(amt) {
                return (
                  <button
                    key={amt}
                    onClick={function() { handleShortcut(amt) }}
                    className="py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium"
                  >
                    {amt >= 1000 ? (amt / 1000) + 'K' : amt}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','000','0','back'].map(function(k) {
                return (
                  <button
                    key={k}
                    onClick={function() { handleNumpad(k) }}
                    className={
                      'rounded-2xl text-xl font-semibold active:scale-95 ' +
                      (k === 'back'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-white border border-gray-200 text-gray-800')
                    }
                  >
                    {k === 'back' ? '⌫' : k}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Card payment</p>
            <p className="text-xs text-gray-400 mb-4">Present card to terminal</p>
            <div className="bg-slate-50 rounded-xl px-4 py-3 w-full max-w-xs mb-4">
              <p className="text-xs text-gray-400">Amount to charge</p>
              <p className="text-xl font-bold text-slate-800">{formatMMK(total)}</p>
            </div>
            <p className="text-xs text-gray-400">Tap confirm once approved</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <button
          onClick={handleCharge}
          disabled={processing || (method === 'cash' && !cashValid)}
          className="w-full py-4 rounded-2xl font-bold text-base bg-slate-800 text-white active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Spinner size="sm" color="white" /><span>Processing...</span></>
          ) : method === 'cash' ? (
            cashValid ? 'Confirm ' + formatMMK(total) : 'Enter cash amount'
          ) : (
            'Confirm card ' + formatMMK(total)
          )}
        </button>
      </div>
    </div>
  )
}
