import React, { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = useCallback(function(variant, product) {
    setItems(function(prev) {
      const existing = prev.find(function(i) { return i.variantId === variant.id })
      if (existing) {
        return prev.map(function(i) {
          return i.variantId === variant.id ? Object.assign({}, i, { qty: i.qty + 1 }) : i
        })
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price: parseFloat(variant.price),
          qty: 1,
          stock: variant.stock || 0,
          imageUrl: variant.imageUrl || null,
        },
      ]
    })
  }, [])

  const removeItem = useCallback(function(variantId) {
    setItems(function(prev) { return prev.filter(function(i) { return i.variantId !== variantId }) })
  }, [])

  const updateQty = useCallback(function(variantId, qty) {
    if (qty < 1) return
    setItems(function(prev) {
      return prev.map(function(i) {
        return i.variantId === variantId ? Object.assign({}, i, { qty: qty }) : i
      })
    })
  }, [])

  const clearCart = useCallback(function() { setItems([]) }, [])

  const subtotal = items.reduce(function(sum, i) { return sum + i.price * i.qty }, 0)
  const taxRate = 0
  const taxAmt = 0
  const total = subtotal
  const itemCount = items.reduce(function(sum, i) { return sum + i.qty }, 0)

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      subtotal, taxRate, taxAmt, total, itemCount,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
