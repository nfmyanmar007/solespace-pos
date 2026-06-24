import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'
import { formatMMK } from '../../lib/currency'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminReports() {
  const [period, setPeriod] = useState('today')
  const [stats, setStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() { loadReport() }, [period])

  function getDateRange() {
    const now = new Date()
    const start = new Date()
    if (period === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
    }
    return start.toISOString()
  }

  async function loadReport() {
    setLoading(true)
    const since = getDateRange()
    const { data: txns } = await supabase
      .from('transactions')
      .select('id, total, subtotal, discount_amt, status, completed_at, staff ( full_name ), payments ( method )')
      .eq('store_id', STORE_ID)
      .eq('status', 'completed')
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })

    const safe = txns || []
    const revenue = safe.reduce(function(s, t) { return s + parseFloat(t.total) }, 0)
    const discounts = safe.reduce(function(s, t) { return s + parseFloat(t.discount_amt || 0) }, 0)
    const cashTxns = safe.filter(function(t) { return t.payments && t.payments[0] && t.payments[0].method === 'cash' })
    const cardTxns = safe.filter(function(t) { return t.payments && t.payments[0] && t.payments[0].method === 'card' })

    setStats({
      revenue,
      count: safe.length,
      avg: safe.length > 0 ? revenue / safe.length : 0,
      discounts,
      cashCount: cashTxns.length,
      cardCount: cardTxns.length,
    })
    setTransactions(safe)

    if (safe.length > 0) {
      const { data: items } = await supabase
        .from('transaction_items')
        .select('qty, line_total, product_variants ( products ( name ) )')
        .in('transaction_id', safe.map(function(t) { return t.id }))
      const agg = {}
      ;(items || []).forEach(function(item) {
        const name = item.product_variants && item.product_variants.products
          ? item.product_variants.products.name : 'Unknown'
        if (!agg[name]) agg[name] = { name: name, qty: 0, revenue: 0 }
        agg[name].qty += item.qty
        agg[name].revenue += parseFloat(item.line_total)
      })
      setTopProducts(Object.values(agg).sort(function(a, b) { return b.revenue - a.revenue }).slice(0, 10))
    } else {
      setTopProducts([])
    }
    setLoading(false)
  }

  function exportCSV() {
    const rows = [['Ref', 'Date', 'Staff', 'Method', 'Total'].join(',')]
    transactions.forEach(function(t) {
      rows.push([
        t.ref_number || '',
        new Date(t.completed_at).toLocaleDateString(),
        t.staff ? t.staff.full_name : '',
        t.payments && t.payments[0] ? t.payments[0].method : '',
        t.total,
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'solespace-report-' + period + '.csv'
    a.click()
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sales Reports</h2>
            <p className="text-sm text-gray-400">Revenue and transaction analysis</p>
          </div>
          <div className="flex gap-2">
            {['today', 'week', 'month'].map(function(p) {
              return (
                <button
                  key={p}
                  onClick={function() { setPeriod(p) }}
                  className={
                    'px-4 py-2 rounded-xl text-sm font-medium ' +
                    (period === p ? 'bg-slate-800 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')
                  }
                >
                  {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            Loading report...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatMMK(stats ? stats.revenue : 0)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{stats ? stats.count : 0}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Average Sale</p>
                <p className="text-xl font-bold text-gray-900">{formatMMK(stats ? stats.avg : 0)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Total Discounts</p>
                <p className="text-xl font-bold text-green-700">- {formatMMK(stats ? stats.discounts : 0)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Cash Sales</p>
                <p className="text-xl font-bold text-gray-900">{stats ? stats.cashCount : 0}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-1">Card Sales</p>
                <p className="text-xl font-bold text-gray-900">{stats ? stats.cardCount : 0}</p>
              </div>
            </div>

            {topProducts.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Top Products</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {topProducts.map(function(p, i) {
                    return (
                      <div key={i} className="flex items-center gap-4 px-5 py-3">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.qty} units sold</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatMMK(p.revenue)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Transactions ({transactions.length})
                </h3>
                <button
                  onClick={exportCSV}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Export CSV
                </button>
              </div>
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No transactions for this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Time</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Staff</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Method</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(function(t) {
                        return (
                          <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs text-gray-600">
                              {new Date(t.completed_at).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-800">
                              {t.staff ? t.staff.full_name : 'Unknown'}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {t.payments && t.payments[0] ? t.payments[0].method : 'Unknown'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold text-gray-900">
                              {formatMMK(t.total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
