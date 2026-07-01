import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { useCart } from '../context/CartContext'
import { useSale } from '../context/SaleContext'
import { formatMMK } from '../lib/currency'
import SearchBar from '../components/pos/SearchBar'
import ProductList from '../components/pos/ProductList'
import CartSheet from '../components/pos/CartSheet'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function POSHome() {
  const navigate = useNavigate()
  const { session, logout } = useSession()
  const { addItem, itemCount, subtotal } = useCart()
  const { discount } = useSale()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', description: '', barcode: '', price: '' })
  const [customMsg, setCustomMsg] = useState('')

  const discountAmt = discount ? discount.calculatedAmt : 0
  const total = Math.max(0, subtotal - discountAmt)

  const search = useCallback(async function(q) {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data: variantData } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, size, color, price, is_active, products ( id, name, image_url, is_general, description ), inventory ( qty_on_hand, store_id )')
        .eq('is_active', true)
        .or('sku.ilike.%' + q + '%,barcode.eq.' + q)
        .limit(20)

      const { data: nameData } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, size, color, price, is_active, products!inner ( id, name, image_url, is_general, description ), inventory ( qty_on_hand, store_id )')
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
        const storeInventory = (v.inventory || []).find(function(i) { return i.store_id === STORE_ID })
        const isGeneral = v.products ? v.products.is_general : false
        return {
          variantId: v.id,
          productName: v.products ? v.products.name : 'Unknown',
          imageUrl: v.products ? (v.products.image_url || null) : null,
          description: v.products ? (v.products.description || '') : '',
          sku: v.sku,
          size: isGeneral ? null : v.size,
          color: isGeneral ? null : v.color,
          price: v.price,
          stock: storeInventory ? storeInventory.qty_on_hand : 0,
          isGeneral: isGeneral,
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
        isGeneral: item.isGeneral,
      },
      { name: item.productName }
    )
  }

  function handleAddCustom() {
    if (!customForm.name || !customForm.price) {
      setCustomMsg('Name and price are required.')
      return
    }
    const price = parseFloat(customForm.price)
    if (isNaN(price) || price <= 0) {
      setCustomMsg('Please enter a valid price.')
      return
    }
    addItem(
      {
        id: '00000000-0000-0000-0000-000000000099',
        sku: customForm.barcode || 'CUSTOM',
        size: null,
        color: null,
        price: price,
        stock: 999,
        imageUrl: null,
        isCustom: true,
      },
      { name: customForm.name + (customForm.description ? ' (' + customForm.description + ')' : '') }
    )
    setCustomForm({ name: '', description: '', barcode: '', price: '' })
    setCustomMsg('')
    setShowCustomForm(false)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">👟</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Htoo Shoes Collection</p>
            <p className="text-xs text-slate-400 leading-tight truncate">
              {session ? session.staffName : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={function() { navigate('/pos/summary') }}
            className="text-xs text-slate-300 bg-slate-700 px-2.5 py-1.5 rounded-lg font-medium"
          >
            My Day
          </button>
          {session && (session.role === 'admin' || session.role === 'manager') ? (
            <button
              onClick={function() {
                localStorage.setItem('admin_session', JSON.stringify({
                  staffId: session.staffId,
                  staffName: session.staffName,
                  role: session.role,
                  storeId: session.storeId,
                }))
                navigate('/admin-dashboard')
              }}
              className="text-xs text-slate-300 bg-slate-600 border border-slate-500 px-2.5 py-1.5 rounded-lg font-medium"
            >
              Admin →
            </button>
          ) : null}
          <button onClick={handleLogout} className="text-slate-300 p-1">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="px-3 pt-3 pb-1 sticky top-12 bg-white z-20 space-y-2">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={function() { setQuery(''); setResults([]) }}
        />
        <button
          onClick={function() { setShowCustomForm(!showCustomForm); setCustomMsg('') }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs font-medium hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <Plus size={14} />
          Custom Item
        </button>

        {showCustomForm ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700">Add Custom Item</p>
              <button onClick={function() { setShowCustomForm(false); setCustomMsg('') }} className="text-gray-400">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Item name *"
              value={customForm.name}
              onChange={function(e) { setCustomForm(Object.assign({}, customForm, { name: e.target.value })) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={customForm.description}
              onChange={function(e) { setCustomForm(Object.assign({}, customForm, { description: e.target.value })) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
            />
            <input
              type="text"
              placeholder="Barcode (optional)"
              value={customForm.barcode}
              onChange={function(e) { setCustomForm(Object.assign({}, customForm, { barcode: e.target.value })) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
            />
            <input
              type="number"
              placeholder="Price (MMK) *"
              value={customForm.price}
              onChange={function(e) { setCustomForm(Object.assign({}, customForm, { price: e.target.value })) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
            />
            {customMsg ? (
              <p className="text-xs text-red-500">{customMsg}</p>
            ) : null}
            <button
              onClick={handleAddCustom}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold"
            >
              Add to Cart
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 px-3 pb-16 overflow-y-auto">
        <ProductList
          results={results}
          loading={loading}
          query={query}
          onAdd={handleAdd}
        />
      </div>

      {itemCount > 0 ? (
        <button
          onClick={function() { setCartOpen(true) }}
          className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between shadow-2xl z-40 active:bg-slate-700"
        >
          <div className="flex items-center gap-2">
            <span className="bg-white text-slate-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
            <span className="text-xs font-medium text-slate-300">items</span>
          </div>
          <span className="text-sm font-bold">{formatMMK(total)}</span>
        </button>
      ) : null}

      {cartOpen ? <CartSheet onClose={function() { setCartOpen(false) }} /> : null}
    </div>
  )
}
