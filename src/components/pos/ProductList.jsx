import { formatMMK } from '../../lib/currency'
import React from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'

function StockBadge({ qty }) {
  if (qty === 0)  return <Badge color="red">Out of stock</Badge>
  if (qty <= 3)   return <Badge color="yellow">Low: {qty} left</Badge>
  return <Badge color="green">{qty} in stock</Badge>
}

export default function ProductList({ results, loading, query, onAdd }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" color="blue" />
      </div>
    )
  }

  if (!query) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">👟</div>
        <p className="text-sm">Search for a product or scan a barcode</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm">No products found for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((item) => (
        <div
          key={item.variantId}
          className="
            flex items-center gap-3 p-3 bg-white rounded-xl
            border border-gray-200 hover:border-blue-300
            hover:shadow-sm transition-all
          "
        >
          {/* Product icon */}
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
            👟
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {item.productName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Size {item.size} · {item.color} · {item.sku}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <StockBadge qty={item.stock} />
            </div>
          </div>

          {/* Price + Add button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-gray-900">
              {formatMMK(item.price)}
            </span>
            <button
              onClick={() => onAdd(item)}
              disabled={item.stock === 0}
              className="
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-slate-800 text-white
                hover:bg-slate-700 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all
              "
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
