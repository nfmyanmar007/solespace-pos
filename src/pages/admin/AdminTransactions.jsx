import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'
import { formatMMK } from '../../lib/currency'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [items, setItems] = useState([])
  const [voiding, setVoiding] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(function() { loadTransactions() }, [])

  async function loadTransactions() {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('id, ref_number, total, status, completed_at, staff ( full_name ), customers ( full_name ), payments ( method, amount )')
      .eq('store_id', STORE_ID)
      .order('completed_at', { ascending: false })
      .limit(50)
    setTransactions(data || [])
    setLoading(false)
  }

  async function loadItems(txnId) {
    const { data } = await supabase
      .from('transaction_items')
      .select('qty, unit_price, line_total, product_variants ( sku, size, color, products ( name ) )')
      .eq('transaction_id', txnId)
    setItems(data || [])
  }

  async function handleSelect(t) {
    setSelected(t)
    setMsg('')
    loadItems(t.id)
  }

  async function handleVoid() {
    if (!selected) return
    if (!window.confirm('Are you sure you want to void transaction ' + selected.ref_number + '?')) return
    setVoiding(true)
    await supabase
      .from('transactions')
      .update({ status: 'voided' })
      .eq('id', selected.id)
    setMsg('Transaction ' + selected.ref_number + ' has been voided.')
    setVoiding(false)
    loadTransactions()
    setSelected(Object.assign({}, selected, { status: 'voided' }))
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
    refunded: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-600',
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-400">Last 50 transactions</p>
        </div>

        {msg ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">{msg}</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-screen overflow-y-auto">
                {transactions.map(function(t) {
                  return (
                    <button
                      key={t.id}
                      onClick={function() { handleSelect(t) }}
                      className={
                        'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ' +
                        (selected && selected.id === t.id ? 'bg-blue-50' : '')
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium text-gray-800">{t.ref_number}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(t.completed_at).toLocaleString()} —
                          {t.staff ? ' ' + t.staff.full_name : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-900">{formatMMK(t.total)}</p>
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (statusColors[t.status] || statusColors.pending)}>
                          {t.status}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {!selected ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">🧾</p>
                <p className="text-sm">Select a transaction to view details</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selected.ref_number}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(selected.completed_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Staff: {selected.staff ? selected.staff.full_name : 'Unknown'}
                      </p>
                      {selected.customers ? (
                        <p className="text-xs text-gray-400">
                          Customer: {selected.customers.full_name}
                        </p>
                      ) : null}
                    </div>
                    <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (statusColors[selected.status] || statusColors.pending)}>
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Items</p>
                  {items.map(function(item, i) {
                    return (
                      <div key={i} className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-medium text-gray-800">
                            {item.product_variants && item.product_variants.products
                              ? item.product_variants.products.name : 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Sz {item.product_variants ? item.product_variants.size : ''} x {item.qty}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{formatMMK(item.line_total)}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="px-5 py-3 border-b border-gray-100 space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Payment method</span>
                    <span className="capitalize">
                      {selected.payments && selected.payments[0] ? selected.payments[0].method : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>Total</span>
                    <span>{formatMMK(selected.total)}</span>
                  </div>
                </div>

                {selected.status === 'completed' ? (
                  <div className="px-5 py-4">
                    <button
                      onClick={handleVoid}
                      disabled={voiding}
                      className="w-full py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      {voiding ? 'Voiding...' : 'Void Transaction'}
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Voiding cannot be undone
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
