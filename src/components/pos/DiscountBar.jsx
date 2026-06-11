import React, { useState } from 'react'
import { Tag, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSale } from '../../context/SaleContext'
import { formatMMK } from '../../lib/currency'
import Spinner from '../ui/Spinner'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function DiscountBar({ subtotal }) {
  const { discount, setDiscount } = useSale()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function applyCode() {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data, error: dbErr } = await supabase
        .from('discounts')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('store_id', STORE_ID)
        .eq('is_active', true)
        .single()

      if (dbErr || !data) {
        setError('Invalid or expired code')
        setLoading(false)
        return
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This code has expired')
        setLoading(false)
        return
      }

      // Check min order
      if (subtotal < data.min_order) {
        setError(`Minimum order ${formatMMK(data.min_order)} required`)
        setLoading(false)
        return
      }

      // Calculate discount amount
      const amt = data.type === 'percent'
        ? (subtotal * data.value) / 100
        : data.value

      setDiscount({ ...data, calculatedAmt: Math.round(amt) })
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  function removeDiscount() {
    setDiscount(null)
    setCode('')
    setError('')
  }

  // Discount applied
  if (discount) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
        <Check size={14} className="text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-800">
            {discount.code} — {discount.name}
          </p>
          <p className="text-xs text-green-600">
            - {formatMMK(discount.calculatedAmt)} off
          </p>
        </div>
        <button onClick={removeDiscount} className="text-green-400 hover:text-green-700">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3">
          <Tag size={13} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Discount code..."
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && applyCode()}
            className="flex-1 text-xs py-2 outline-none placeholder-gray-400 text-gray-800 bg-transparent"
          />
        </div>
        <button
          onClick={applyCode}
          disabled={loading || !code.trim()}
          className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl disabled:opacity-40 hover:bg-slate-700 flex items-center gap-1"
        >
          {loading ? <Spinner size="sm" color="white" /> : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}
    </div>
  )
}
