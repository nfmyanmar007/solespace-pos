import React from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatMMK } from '../../lib/currency'

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">

      {/* Product image */}
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-100 flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="w-full h-full object-cover"
            onError={function(e) {
              e.target.style.display = 'none'
              e.target.parentNode.innerHTML = '<span style="font-size:14px">👟</span>'
            }}
          />
        ) : (
          <span className="text-sm">👟</span>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {item.productName}
        </p>
        <p className="text-xs text-gray-400">
          Sz {item.size} · {item.color}
        </p>
      </div>

      {/* Qty controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={function() {
            if (item.qty === 1) onRemove(item.variantId)
            else onUpdateQty(item.variantId, item.qty - 1)
          }}
          className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95"
        >
          {item.qty === 1
            ? <Trash2 size={10} className="text-red-400" />
            : <Minus size={10} />
          }
        </button>
        <span className="w-6 text-center text-xs font-semibold text-gray-800">
          {item.qty}
        </span>
        <button
          onClick={function() { onUpdateQty(item.variantId, item.qty + 1) }}
          className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95"
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Line total */}
      <div className="w-20 text-right flex-shrink-0">
        <p className="text-xs font-bold text-gray-900">
          {formatMMK(item.price * item.qty)}
        </p>
        {item.qty > 1 && (
          <p className="text-xs text-gray-400">
            {formatMMK(item.price)} ea
          </p>
        )}
      </div>
    </div>
  )
}
