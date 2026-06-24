import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
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
  const { addItem } = useCart()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async function(q) {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const { data: variantData } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, size, color, price, is_active, products ( id, name, image_url ), inventory ( qty_on_hand, store_id )')
        .eq('is_active', true)
        .or('sku.ilike.%' + q + '%,barcode.eq.' + q)
        .limit(20)

      const { data: nameData } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, size, color, price, is_active, products!inner ( id, name, image_url ), inventory ( qty_on_hand, store_id )')
        .eq('is_active', true)
        .ilike('products.name', '%' + q + '%')
        .limit(20)

      const combined = [...(variantData || []), ...(nameData || [])]
      const seen = new Set()
      const unique = combined.filter(function(v) {
        if (seen.has(v.id)) return false
        seen.add(v.id)
        return true
      })

      const mapped = unique.map(function(v) {
        const storeInventory = (v.inventory || []).find(function(i) {
          return i.store_id === STORE_ID
        })
        const imageUrl = v.products ? (v.products.image_url || null) : null
        console.log('Product:', v.products ? v.products.name : '', 'Image:', imageUrl)
        return {
          variantId: v.id,
          productName: v.products ? v.products.name : 'Unknown',
          imageUrl: imageUrl,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          stock: storeInventory ? storeInventory.qty_on_hand : 0,
        }
      })

      setResults(mapped)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(function() {
    const timer = setTimeout(function() { search(query) }, 300)
    return function() { clearTimeout(timer) }
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
        imageUrl: item.imageUrl,
      },
      { name: item.productName }
    )
    setQuery('')
    setResults([])
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">👟</span>
          <div>
            <p className="text-sm font-semibold leading-tight">SoleSpace POS</p>
            <p className="text-xs text-slate-400 leading-tight">
              Downtown - {session ? session.staffName : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={function() { navigate('/pos/summary') }}
            className="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            My Day
          </button>
          <button
            onClick={function() { navigate('/admin-dashboard') }}
            className="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Admin
          </button>
          <span className="text-xs text-slate-400 capitalize bg-slate-700 px-2 py-1 rounded-full">
            {session ? session.role : ''}
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

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={function() { setQuery(''); setResults([]) }}
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
        <div className="w-72 flex-shrink-0">
          <CartPanel />
        </div>
      </div>
    </div>
  )
}
