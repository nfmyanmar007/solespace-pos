import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, ShoppingBag, Users,
  AlertTriangle, RefreshCw
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatMMK } from '../../lib/currency'
import AdminLayout from './AdminLayout'
import MetricCard from '../../components/admin/MetricCard'
import RecentTransactions from '../../components/admin/RecentTransactions'
import InventoryAlerts from '../../components/admin/InventoryAlerts'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminDashboard() {
  const [metrics, setMetrics]       = useState(null)
  const [transactions, setTxns]     = useState([])
  const [alerts, setAlerts]         = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      // 1. Today's transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select(`
          id, ref_number, total, subtotal, status,
          completed_at,
          staff:staff_id ( full_name ),
          payments ( method )
        `)
        .eq('store_id', STORE_ID)
        .gte('completed_at', todayISO)
        .order('completed_at', { ascending: false })
        .limit(20)

      const safeTxns = txns || []
      const completed = safeTxns.filter(t => t.status === 'completed')
      const revenue   = completed.reduce((s, t) => s + parseFloat(t.total), 0)
      const avgSale   = completed.length > 0 ? revenue / completed.length : 0

      setTxns(safeTxns)

      // 2. Customer count
      const { count: custCount } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })

      // 3. Metrics
      setMetrics({
        revenue,
        txnCount: completed.length,
        avgSale,
        custCount: custCount || 0,
      })

      // 4. Inventory alerts (out of stock or below reorder point)
      const { data: invData } = await supabase
        .from('inventory')
        .select(`
          qty_on_hand, reorder_point,
          product_variants ( sku, size, color,
            products ( name )
          )
        `)
        .eq('store_id', STORE_ID)
        .or('qty_on_hand.eq.0,qty_on_hand.lte.reorder_point')
        .order('qty_on_hand', { ascending: true })
        .limit(10)

      setAlerts((invData || []).map(inv => ({
        qty:         inv.qty_on_hand,
        sku:         inv.product_variants?.sku,
        size:        inv.product_variants?.size,
        color:       inv.product_variants?.color,
        productName: inv.product_variants?.products?.name || 'Unknown',
      })))

      // 5. Top products today
      if (completed.length > 0) {
        const txnIds = completed.map(t => t.id)
        const { data: itemData } = await supabase
          .from('transaction_items')
          .select(`qty, line_total, product_variants ( products ( name ) )`)
          .in('transaction_id', txnIds)

        const agg = {}
        ;(itemData || []).forEach(item => {
          const name = item.product_variants?.products?.name || 'Unknown'
          if (!agg[name]) agg[name] = { name, qty: 0, revenue: 0 }
          agg[name].qty     += item.qty
          agg[name].revenue += parseFloat(item.line_total)
        })

        setTopProducts(
          Object.values(agg)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        )
      }
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Revenue today"
            value={loading ? '...' : formatMMK(metrics?.revenue || 0)}
            icon={TrendingUp}
            color="blue"
          />
          <MetricCard
            label="Transactions"
            value={loading ? '...' : metrics?.txnCount || 0}
            sub="completed sales"
            icon={ShoppingBag}
            color="green"
          />
          <MetricCard
            label="Avg sale value"
            value={loading ? '...' : formatMMK(metrics?.avgSale || 0)}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            label="Total customers"
            value={loading ? '...' : metrics?.custCount || 0}
            sub="registered"
            icon={Users}
            color="amber"
          />
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Transactions — takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentTransactions
              transactions={transactions}
              loading={loading}
            />
          </div>

          {/* Inventory alerts */}
          <div>
            <InventoryAlerts
              alerts={alerts}
              loading={loading}
            />
          </div>
        </div>

        {/* Top products */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">
                Top Products Today
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.qty} units sold</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {formatMMK(p.revenue)}
                  </p>
                  {/* Revenue bar */}
                  <div className="w-20 hidden lg:block">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 rounded-full"
                        style={{
                          width: `${Math.round((p.revenue / topProducts[0].revenue) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
