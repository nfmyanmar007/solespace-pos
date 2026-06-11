import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Store } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { useCart } from '../context/CartContext'
import SearchBar from '../components/pos/SearchBar'
import ProductList from '../components/pos/ProductList'
import CartPanel from '../components/pos/CartPanel'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function POSHome() {
  const navigate = useNavigate()
  const { session, logout } = useSession()
  const { addItem, itemCount } = useCart()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  // Search products
  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, sku, barcode, size, color, price, is_active,
          products ( id, name, gender ),
          inventory!inner ( qty_on_hand, store_id )
        `)
        .eq('inventory.store_id', STORE_ID)
        .eq('is_active', true)
        .or(
          `sku.ilike.%${q}%,barcode.eq.${q}`,
          { referencedTable: 'product_variants' }
        )
        .or(`name.ilike.%${q}%`, { referencedTable: 'products' })
        .limit(20)

      if (error) throw error

      const mapped = (data || []).map((v) => ({
        variantId: v.id,
        productName: v.products?.name || 'Unknown',
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.price,
        stock: v.inventory?.[0]?.qty_on_hand ?? 0,
      }))

      setResults(mapped)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleAdd(item) {
    addItem(
      {
        id: item.variantId,
        sku: item.sku,
        size: item.size,
        color: item.color,
        price: item.price,
        stock: item.stock,
      },
      { name: item.productName }
    )
    // Clear search after adding
    setQuery('')
    setResults([])
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top bar */}
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">👟</span>
          <div>
            <p className="text-sm font-semibold leading-tight">SoleSpace POS</p>
            <p className="text-xs text-slate-400 leading-tight">
              <Store size={10} className="inline mr-1" />
              Downtown · {session?.staffName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 capitalize bg-slate-700 px-2 py-1 rounded-full">
            {session?.role}
          </span>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">

        {/* Left: Search + Results */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={() => { setQuery(''); setResults([]) }}
          />
          <div className="flex-1 overflow-y-auto">
            <ProductList
              results={results}
              loading={loading}
              query={query}
              onAdd={handleAdd}
            />
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-72 flex-shrink-0">
          <CartPanel />
        </div>
      </div>
    </div>
  )
}
