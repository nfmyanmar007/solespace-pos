import React, { createContext, useContext, useState } from 'react'

const SaleContext = createContext(null)

export function SaleProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [discount, setDiscount] = useState(null)

  function clearSale() {
    setCustomer(null)
    setDiscount(null)
  }

  return (
    <SaleContext.Provider value={{
      customer, setCustomer,
      discount, setDiscount,
      clearSale,
    }}>
      {children}
    </SaleContext.Provider>
  )
}

export function useSale() {
  const ctx = useContext(SaleContext)
  if (!ctx) throw new Error('useSale must be used within SaleProvider')
  return ctx
}
