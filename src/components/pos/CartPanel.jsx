import React from 'react'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useSale } from '../../context/SaleContext'
import CartItem from './CartItem'
import CustomerSearch from './CustomerSearch'
import DiscountBar from './DiscountBar'
import { useNavigate } from 'react-router-dom'
import { formatMMK } from '../../lib/currency'

export default function CartPanel() {
  const { items, removeItem, updateQty, clearCart, subtotal, itemCount } = useCart()
  const { discount } = useSale()
  const navigate = useNavigate()

  const discountAmt = discount?.calculatedAmt || 0
  const total = Math.max(0, subtotal - discountAmt)

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-600" />
          <span className="text-sm font-semibold text-gray-800">Cart</span>
          {itemCount > 0 && (
            <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Customer search */}
      <div className="px-3 pt-3">
        <CustomerSearch />
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 mt-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
            <ShoppingCart size={36} />
            <p className="text-sm mt-3">Cart is empty</p>
            <p className="text-xs mt-1">Search and add products</p>
          </div>
        ) : (
          <div className="py-2">
            {items.map((item) => (
              <CartItem
                key={item.variantId}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Discount + totals */}
      {items.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3">
          <DiscountBar subtotal={subtotal} />

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
              <span>{formatMMK(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount ({discount.code})</span>
                <span>- {formatMMK(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{formatMMK(total)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/pos/payment')}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 active:scale-98 transition-all"
          >
            Charge {formatMMK(total)}
          </button>
        </div>
      )}
    </div>
  )
}
