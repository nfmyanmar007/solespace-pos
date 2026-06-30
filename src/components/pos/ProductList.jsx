import React from 'react'
import { formatMMK } from '../../lib/currency'
import Spinner from '../ui/Spinner'

function StockTag({ qty }) {
  if (qty === 0) {
    return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
  }
  if (qty <= 3) {
    return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{qty} left</span>
  }
  return <span className="text-xs text-gray-400">{qty} in stock</span>
}

function ProductImage({ src, name }) {
  const [error, setError] = React.useState(false)
  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        onError={function() { setError(true) }}
        className="w-12 h-12 object-cover rounded-xl flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
      👟
    </div>
  )
}

export default function ProductList({ results, loading, query, onAdd }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" color="blue" />
      </div>
    )
  }

  if (!query) {
    return (
      <div className="text-center py-20 text-gray-300">
        <div className="text-5xl mb-4">👟</div>
        <p className="text-sm text-gray-400">Search a product or scan a barcode</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20 text-gray-300">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-sm text-gray-400">No products found for "{query}"</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 -mx-3">
      {results.map(function(item) {
        const out = item.stock === 0
        return (
          <button
            key={item.variantId}
            onClick={function() { if (!out) onAdd(item) }}
            disabled={out}
            className="w-full flex items-center gap-3 px-3 py-3 active:bg-gray-50 disabled:opacity-40 text-left"
          >
            <ProductImage src={item.imageUrl} name={item.productName} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {item.productName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sz {item.size} — {item.color}
              </p>
              <div className="mt-1">
                <StockTag qty={item.stock} />
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">
                {formatMMK(item.price)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
