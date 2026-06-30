import React from 'react'
import { formatMMK } from '../../lib/currency'
import Spinner from '../ui/Spinner'
import Badge from '../ui/Badge'

function StockBadge({ qty }) {
  if (qty === 0) return <Badge color="red">Out of stock</Badge>
  if (qty <= 3) return <Badge color="yellow">{qty} left</Badge>
  return <Badge color="green">{qty} in stock</Badge>
}

function ProductImage({ src, name }) {
  const [error, setError] = React.useState(false)
  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={function() { setError(true) }}
        className="w-14 h-14 object-cover rounded-xl border border-gray-200 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-gray-100">
      👟
    </div>
  )
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
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">👟</div>
        <p className="text-sm">Search for a product or scan a barcode</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🔍</div>
        <p className="text-sm">No products found for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map(function(item) {
        return (
          <button
            key={item.variantId}
            onClick={function() { if (item.stock > 0) onAdd(item) }}
            disabled={item.stock === 0}
            className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200 active:bg-gray-50 disabled:opacity-50 text-left"
          >
            <ProductImage src={item.imageUrl} name={item.productName} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {item.productName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sz {item.size} · {item.color}
              </p>
              <div className="mt-1">
                <StockBadge qty={item.stock} />
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-gray-900">
                {formatMMK(item.price)}
              </span>
              <span className="text-xs text-blue-600 font-medium">
                Tap to add
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
