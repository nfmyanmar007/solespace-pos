import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'
import { formatMMK } from '../../lib/currency'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminGeneralProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    barcode: '',
    price: '',
    stock: '',
  })

  useEffect(function() { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, description, is_active, image_url, product_variants ( id, sku, barcode, price, inventory ( qty_on_hand ) )')
      .eq('is_general', true)
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditProduct(null)
    setForm({ name: '', description: '', barcode: '', price: '', stock: '0' })
    setShowForm(true)
    setMsg('')
  }

  function openEdit(p) {
    const variant = p.product_variants ? p.product_variants[0] : null
    const inv = variant && variant.inventory ? variant.inventory[0] : null
    setEditProduct(p)
    setForm({
      name: p.name,
      description: p.description || '',
      barcode: variant ? (variant.barcode || '') : '',
      price: variant ? String(variant.price) : '',
      stock: inv ? String(inv.qty_on_hand) : '0',
    })
    setShowForm(true)
    setMsg('')
  }

  async function handleSave() {
    if (!form.name || !form.price) {
      setMsg('Name and price are required.')
      return
    }
    setSaving(true)
    setMsg('Saving...')
    try {
      if (editProduct) {
        await supabase
          .from('products')
          .update({ name: form.name, description: form.description || null })
          .eq('id', editProduct.id)

        const variant = editProduct.product_variants ? editProduct.product_variants[0] : null
        if (variant) {
          await supabase
            .from('product_variants')
            .update({
              barcode: form.barcode || null,
              price: parseFloat(form.price),
            })
            .eq('id', variant.id)

          const inv = variant.inventory ? variant.inventory[0] : null
          if (inv) {
            await supabase
              .from('inventory')
              .update({ qty_on_hand: parseInt(form.stock) || 0 })
              .eq('id', inv.id)
          }
        }
        setMsg('Updated successfully.')
      } else {
        const { data: prod } = await supabase
          .from('products')
          .insert({
            name: form.name,
            description: form.description || null,
            is_general: true,
            is_active: true,
          })
          .select('id')
          .single()

        if (prod) {
          const sku = 'GEN-' + form.name.toUpperCase().replace(/\s+/g, '-').slice(0, 15)
          const { data: variant } = await supabase
            .from('product_variants')
            .insert({
              product_id: prod.id,
              sku: sku,
              barcode: form.barcode || null,
              size: 'ONE',
              color: 'N/A',
              price: parseFloat(form.price),
              is_active: true,
            })
            .select('id')
            .single()

          if (variant) {
            await supabase
              .from('inventory')
              .insert({
                variant_id: variant.id,
                store_id: STORE_ID,
                qty_on_hand: parseInt(form.stock) || 0,
                reorder_point: 5,
              })
          }
        }
        setMsg('Product created successfully.')
      }
      loadProducts()
      setShowForm(false)
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setSaving(false)
  }

  async function toggleActive(p) {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    loadProducts()
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">General Products</h2>
            <p className="text-sm text-gray-400">Accessories, services, and misc items</p>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700"
          >
            + Add Item
          </button>
        </div>

        {msg ? (
          <div className={
            'border rounded-xl px-4 py-3 text-sm ' +
            (msg.includes('Error')
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700')
          }>
            {msg}
          </div>
        ) : null}

        {showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">
              {editProduct ? 'Edit Item' : 'Add New Item'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Item Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={function(e) { setForm(Object.assign({}, form, { name: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. Sports Socks"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. Pack of 3 pairs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Barcode (optional)</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={function(e) { setForm(Object.assign({}, form, { barcode: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Scan or type barcode"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Price (MMK) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={function(e) { setForm(Object.assign({}, form, { price: e.target.value })) }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="e.g. 3000"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={function(e) { setForm(Object.assign({}, form, { stock: e.target.value })) }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="e.g. 50"
                    min="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={function() { setShowForm(false) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No general products yet. Add your first item above.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {products.map(function(p) {
                const variant = p.product_variants ? p.product_variants[0] : null
                const inv = variant && variant.inventory ? variant.inventory[0] : null
                const stock = inv ? inv.qty_on_hand : 0
                return (
                  <div key={p.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.description || 'No description'}</p>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-xs font-bold text-gray-900">
                        {variant ? formatMMK(variant.price) : '—'}
                      </p>
                      <p className="text-xs text-gray-400">{stock} in stock</p>
                    </div>
                    <span className={
                      'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ' +
                      (p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')
                    }>
                      {p.is_active ? 'Active' : 'Off'}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={function() { openEdit(p) }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={function() { toggleActive(p) }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        {p.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
