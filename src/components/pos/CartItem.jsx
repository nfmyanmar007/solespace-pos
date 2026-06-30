import React from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatMMK } from '../../lib/currency'

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3">

      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="w-full h-full object-cover"
            onError={function(e) {
              e.target.style.display = 'none'
              e.target.parentNode.innerHTML = '<span style="font-size:22px">👟</span>'
            }}
          />
        ) : (
          <span className="text-2xl">👟</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {item.productName}
        </p>
        <p className="text-xs text-gray-400 mb-2">
          Sz {item.size} — {item.color}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={function() {
                if (item.qty === 1) onRemove(item.variantId)
                else onUpdateQty(item.variantId, item.qty - 1)
              }}
              className="w-7 h-7 flex items-center justify-center text-gray-600 active:bg-gray-100"
            >
              <Minus size={13} />
            </button>
            <span className="w-7 text-center text-sm font-semibold text-gray-900">
              {item.qty}
            </span>
            <button
              onClick={function() { onUpdateQty(item.variantId, item.qty + 1) }}
              className="w-7 h-7 flex items-center justify-center text-gray-600 active:bg-gray-100"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {formatMMK(item.price * item.qty)}
            </p>
            {item.qty > 1 ? (
              <p className="text-xs text-gray-400">{formatMMK(item.price)} each</p>
            ) : null}
          </div>
        </div>

        <button
          onClick={function() { onRemove(item.variantId) }}
          className="text-xs text-blue-600 mt-2"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
