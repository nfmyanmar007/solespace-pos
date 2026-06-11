import React from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-gray-100 last:border-0">
      {/* Icon */}
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
        👟
      </div>

      {/* Info */}
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
          onClick={() =>
            item.qty === 1
              ? onRemove(item.variantId)
              : onUpdateQty(item.variantId, item.qty - 1)
          }
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
          onClick={() => onUpdateQty(item.variantId, item.qty + 1)}
          className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95"
        >
          <Plus size={10} />
        </button>
      </div>

      {/* Line total */}
      <div className="w-14 text-right flex-shrink-0">
        <p className="text-xs font-bold text-gray-900">
          ${(item.price * item.qty).toFixed(2)}
        </p>
        {item.qty > 1 && (
          <p className="text-xs text-gray-400">
            ${item.price.toFixed(2)} ea
          </p>
        )}
      </div>
    </div>
  )
}
