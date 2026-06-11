import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, ShoppingBag, Award, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { formatMMK } from '../lib/currency'
import Spinner from '../components/ui/Spinner'
import TopBar from '../components/pos/TopBar'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function SummaryPage() {
  const navigate = useNavigate()
  const { session } = useSession()
  const [stats, setStats] = useState(null)
  const [topItems, setTopItems] = useState([])
  const [recentTxns, setRecentTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const isManager = session && (session.role === 'manager' || session.role === 'admin')

  useEffect(() => { loadSummary() }, [])

  async function loadSummary() {
    setLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()
      let txnQuery = supabase
        .from('transactions')
        .select('id, total, subtotal, completed_at, status, staff_id')
        .eq('store_id', STORE_ID)
        .eq('status', 'completed')
        .gte('completed_at', todayISO)
      if (!isManager) {
        txnQuery = txnQuery.eq('staff_id', session.staffId)
      }
      const { data: txns } = await txnQuery
      const safeTxns = txns || []
      const totalRevenue = safeTxns.reduce((s, t) => s + parseFloat(t.total), 0)
      const txnCount = safeTxns.length
      const avgSale = txnCount > 0 ? totalRevenue / txnCount : 0
      setStats({ totalRevenue, txnCount, avgSale })
      setRecentTxns(safeTxns.slice(-5).reverse())
      if (safeTxns.length > 0) {
        const txnIds = safeTxns.map((t) => t.id)
        const { data: itemData } = await supabase
          .from('transaction_items')
          .select('qty, line_total, product_variants ( products ( name ) )')
          .in('transaction_id', txnIds)
        const agg = {}
        ;(itemData || []).forEach((item) => {
          const name = item.product_variants && item.product_variants.products
            ? item.product_variants.products.name : 'Unknown'
          if (!agg[name]) agg[name] = { name, qty: 0, revenue: 0 }
          agg[name].qty += item.qty
          agg[name].revenue += parseFloat(item.line_total)
        })
        setTopItems(Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 5))
      }
    } catch (err) {
      console.error('Summary error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopBar title="Daily Summary" showBack backTo="/pos" />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" color="blue" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar
        title={isManager ? 'Store Summary' : 'My Day'}
        subtitle={"Today - " + new Date().toLocaleDateString()}
        showBack
        backTo="/pos"
      />
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
              <span className="text-xs text-gray-400">Revenue</span>
            </div>
            <p className="text-base font-bold text-gray-900 leading-tight">
              {formatMMK(stats ? stats.totalRevenue : 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag size={14} className="text-green-600" />
              </div>
              <span className="text-xs text-gray-400">Sales</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats ? stats.txnCount : 0}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award size={14} className="text-purple-600" />
              </div>
              <span className="text-xs text-gray-400">Avg sale</span>
            </div>
            <p className="text-base font-bold text-gray-900 leading-tight">
              {formatMMK(stats ? stats.avgSale : 0)}
            </p>
          </div>
        </div>

        {topItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Top Products Today</p>
            </div>
            <div className="divide-y divide-gray-50">
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.qty} sold</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatMMK(item.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentTxns.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Recent Transactions</p>
            </div>
            <div className="divide-y divide-gray-50">
              {recentTxns.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">
                      {new Date(txn.completed_at).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{txn.status}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatMMK(txn.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && stats.txnCount === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-500 text-sm">No sales yet today</p>
          </div>
        )}

        <button
          onClick={loadSummary}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  )
}
