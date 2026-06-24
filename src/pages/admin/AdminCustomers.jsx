import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'
import { formatMMK } from '../../lib/currency'

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(function() { loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('lifetime_spend', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  async function loadHistory(customerId) {
    setHistoryLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('id, ref_number, total, status, completed_at, payments ( method )')
      .eq('customer_id', customerId)
      .order('completed_at', { ascending: false })
      .limit(20)
    setHistory(data || [])
    setHistoryLoading(false)
  }

  function selectCustomer(c) {
    setSelected(c)
    loadHistory(c.id)
  }

  const filtered = customers.filter(function(c) {
    const q = search.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
  })

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-400">{customers.length} registered customers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={function(e) { setSearch(e.target.value) }}
                className="w-full text-sm outline-none text-gray-800 placeholder-gray-400"
              />
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {filtered.map(function(c) {
                  return (
                    <button
                      key={c.id}
                      onClick={function() { selectCustomer(c) }}
                      className={
                        'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ' +
                        (selected && selected.id === c.id ? 'bg-blue-50' : '')
                      }
                    >
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                        {c.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{c.full_name}</p>
                        <p className="text-xs text-gray-400">{c.phone} — {c.visit_count} visits</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 flex-shrink-0">
                        {formatMMK(c.lifetime_spend)}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {!selected ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">👤</p>
                <p className="text-sm">Select a customer to view history</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">{selected.full_name}</h3>
                  <p className="text-xs text-gray-400">{selected.phone} — {selected.email || 'No email'}</p>
                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-400">Lifetime spend</p>
                      <p className="text-sm font-bold text-gray-900">{formatMMK(selected.lifetime_spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total visits</p>
                      <p className="text-sm font-bold text-gray-900">{selected.visit_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Member since</p>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(selected.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500">Purchase history</p>
                </div>
                {historyLoading ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
                ) : history.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No purchases yet</div>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {history.map(function(t) {
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-800">{t.ref_number}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(t.completed_at).toLocaleDateString()} —
                              {t.payments && t.payments[0] ? ' ' + t.payments[0].method : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-900">{formatMMK(t.total)}</p>
                            <span className={
                              'text-xs px-2 py-0.5 rounded-full font-medium ' +
                              (t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')
                            }>
                              {t.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
