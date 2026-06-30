import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useSale } from '../../context/SaleContext'
import CartItem from './CartItem'
import CustomerSearch from './CustomerSearch'
import DiscountBar from './DiscountBar'
import { formatMMK } from '../../lib/currency'

export default function CartSheet({ onClose }) {
  const navigate = useNavigate()
  const { items, removeItem, updateQty, clearCart, subtotal, itemCount } = useCart()
  const { discount } = useSale()

  const discountAmt = discount ? discount.calculatedAmt : 0
  const total = Math.max(0, subtotal - discountAmt)

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slideup">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-gray-700" />
          <span className="text-base font-bold text-gray-900">Cart ({itemCount})</span>
        </div>
        <div className="flex items-center gap-3">
          {items.length > 0 ? (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 flex items-center gap-1"
            >
              <Trash2 size={13} />
              Clear
            </button>
          ) : null}
          <button onClick={onClose} className="text-gray-400 p-1">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Customer search */}
      <div className="px-3 pt-3 flex-shrink-0">
        <CustomerSearch />
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 mt-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-12">
            <ShoppingCart size={48} />
            <p className="text-sm mt-4">Cart is empty</p>
          </div>
        ) : (
          <div className="py-2">
            {items.map(function(item) {
              return (
                <CartItem
                  key={item.variantId}
                  item={item}
                  onUpdateQty={updateQty}
                  onRemove={removeItem}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Discount + totals + checkout */}
      {items.length > 0 ? (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 flex-shrink-0 bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          <DiscountBar subtotal={subtotal} />

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
              <span>{formatMMK(subtotal)}</span>
            </div>
            {discountAmt > 0 ? (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span>
                <span>- {formatMMK(discountAmt)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{formatMMK(total)}</span>
            </div>
          </div>

          <button
            onClick={function() { navigate('/pos/payment') }}
            className="w-full py-4 rounded-2xl font-bold text-base bg-slate-800 text-white active:scale-98 transition-all"
          >
            Charge {formatMMK(total)}
          </button>
        </div>
      ) : null}
    </div>
  )
}
