import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminInventory() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editRow, setEditRow] = useState(null)
  const [newQty, setNewQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(function() { loadInventory() }, [])

  async function loadInventory() {
    setLoading(true)
    const { data } = await supabase
      .from('inventory')
      .select('id, qty_on_hand, reorder_point, updated_at, product_variants ( id, sku, size, color, price, products ( name ) )')
      .eq('store_id', STORE_ID)
      .order('qty_on_hand', { ascending: true })
    setInventory(data || [])
    setLoading(false)
  }

  const filtered = inventory.filter(function(row) {
    const v = row.product_variants
    const name = v && v.products ? v.products.name.toLowerCase() : ''
    const sku = v ? v.sku.toLowerCase() : ''
    const q = search.toLowerCase()
    const matchSearch = name.includes(q) || sku.includes(q)
    if (filter === 'out') return matchSearch && row.qty_on_hand === 0
    if (filter === 'low') return matchSearch && row.qty_on_hand > 0 && row.qty_on_hand <= row.reorder_point
    if (filter === 'ok') return matchSearch && row.qty_on_hand > row.reorder_point
    return matchSearch
  })

  async function handleUpdate() {
    if (!editRow || newQty === '') return
    setSaving(true)
    await supabase
      .from('inventory')
      .update({ qty_on_hand: parseInt(newQty), updated_at: new Date().toISOString() })
      .eq('id', editRow.id)
    setMsg('Stock updated for ' + (editRow.product_variants ? editRow.product_variants.sku : ''))
    setEditRow(null)
    setNewQty('')
    setSaving(false)
    loadInventory()
  }

  const outCount = inventory.filter(function(r) { return r.qty_on_hand === 0 }).length
  const lowCount = inventory.filter(function(r) { return r.qty_on_hand > 0 && r.qty_on_hand <= r.reorder_point }).length

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inventory</h2>
            <p className="text-sm text-gray-400">{inventory.length} SKUs tracked</p>
          </div>
          <button
            onClick={loadInventory}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-xs text-red-500 mb-1">Out of stock</p>
            <p className="text-2xl font-bold text-red-700">{outCount}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-xs text-yellow-600 mb-1">Low stock</p>
            <p className="text-2xl font-bold text-yellow-700">{lowCount}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-xs text-green-600 mb-1">Healthy</p>
            <p className="text-2xl font-bold text-green-700">{inventory.length - outCount - lowCount}</p>
          </div>
        </div>

        {msg ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
            {msg}
          </div>
        ) : null}

        {editRow ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Update Stock</h3>
            <p className="text-xs text-gray-400 mb-4">
              {editRow.product_variants ? editRow.product_variants.products.name : ''} —
              Sz {editRow.product_variants ? editRow.product_variants.size : ''} —
              {editRow.product_variants ? editRow.product_variants.color : ''}
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Current: {editRow.qty_on_hand} units
                </label>
                <input
                  type="number"
                  value={newQty}
                  onChange={function(e) { setNewQty(e.target.value) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="New quantity"
                  min="0"
                />
              </div>
              <div className="flex gap-2 items-end">
                <button
                  onClick={function() { setEditRow(null); setNewQty('') }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex gap-3 items-center">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={function(e) { setSearch(e.target.value) }}
              className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
            />
            <div className="flex gap-1">
              {['all','out','low','ok'].map(function(f) {
                return (
                  <button
                    key={f}
                    onClick={function() { setFilter(f) }}
                    className={
                      'px-3 py-1 rounded-lg text-xs font-medium ' +
                      (filter === f ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600')
                    }
                  >
                    {f === 'all' ? 'All' : f === 'out' ? 'Out' : f === 'low' ? 'Low' : 'OK'}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">SKU</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Color</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(function(row) {
                    const v = row.product_variants
                    let statusClass = 'bg-green-100 text-green-700'
                    let statusText = 'OK'
                    if (row.qty_on_hand === 0) { statusClass = 'bg-red-100 text-red-700'; statusText = 'Out of stock' }
                    else if (row.qty_on_hand <= row.reorder_point) { statusClass = 'bg-yellow-100 text-yellow-700'; statusText = 'Low stock' }
                    return (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-medium text-gray-800">
                          {v && v.products ? v.products.name : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{v ? v.sku : ''}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{v ? v.size : ''}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{v ? v.color : ''}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">{row.qty_on_hand}</td>
                        <td className="px-4 py-3">
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + statusClass}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={function() { setEditRow(row); setNewQty(String(row.qty_on_hand)); setMsg('') }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Update stock
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
