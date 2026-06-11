import React, { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = useCallback((variant, product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id)
      if (existing) {
        return prev.map((i) =>
          i.variantId === variant.id
            ? { ...i, qty: i.qty + 1 }
            : i
        )
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
          stock: variant.stock ?? 0,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((variantId) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId))
  }, [])

  const updateQty = useCallback((variantId, qty) => {
    if (qty < 1) return
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i))
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const taxRate = 0        // Set to 0 for MMK / Myanmar
  const taxAmt = 0
  const total = subtotal
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0)

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
