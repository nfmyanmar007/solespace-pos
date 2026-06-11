import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, MessageSquare, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSession } from '../context/SessionContext'
import { formatMMK } from '../lib/currency'
import Spinner from '../components/ui/Spinner'
import TopBar from '../components/pos/TopBar'

export default function ReceiptPage() {
  const { txnId } = useParams()
  const navigate = useNavigate()
  const { session } = useSession()

  const [txn, setTxn] = useState(null)
  const [items, setItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    if (!txnId) return
    loadReceipt()
  }, [txnId])

  async function loadReceipt() {
    setLoading(true)
    try {
      // Load transaction
      const { data: txnData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txnId)
        .single()
      setTxn(txnData)

      // Load items with product info
      const { data: itemData } = await supabase
        .from('transaction_items')
        .select(`
          qty, unit_price, line_total,
          product_variants ( sku, size, color,
            products ( name )
          )
        `)
        .eq('transaction_id', txnId)
      setItems(itemData || [])

      // Load payment
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_id', txnId)
        .single()
      setPayment(payData)
    } catch (err) {
      console.error('Receipt load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
    setPrinted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" color="white" />
      </div>
    )
  }

  if (!txn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopBar title="Receipt" showBack backTo="/pos" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Receipt not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar
        title="Receipt"
        subtitle={txn.ref_number}
        showBack
        backTo="/pos"
      />

      <div className="flex-1 p-4 max-w-sm mx-auto w-full">

        {/* Receipt card */}
        <div
          id="receipt-print"
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4"
        >
          {/* Store header */}
          <div className="bg-slate-800 text-white p-5 text-center">
            <div className="text-2xl mb-1">👟</div>
            <h2 className="font-bold text-base">SoleSpace</h2>
            <p className="text-xs text-slate-400">Downtown Store · Chicago</p>
          </div>

          {/* Receipt body */}
          <div className="p-4">
            {/* Ref + date */}
            <div className="flex justify-between text-xs text-gray-400 mb-4 pb-3 border-b border-dashed border-gray-200">
              <span>{txn.ref_number}</span>
              <span>{new Date(txn.completed_at).toLocaleString('en-US', {
                dateStyle: 'medium', timeStyle: 'short'
              })}</span>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">
                      {item.product_variants?.products?.name || 'Product'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Sz {item.product_variants?.size} ·{' '}
                      {item.product_variants?.color} × {item.qty}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 ml-2">
                    {formatMMK(item.line_total)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{formatMMK(txn.subtotal)}</span>
              </div>
              {txn.discount_amt > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Discount</span>
                  <span>- {formatMMK(txn.discount_amt)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatMMK(txn.total)}</span>
              </div>
            </div>

            {/* Payment details */}
            {payment && (
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Payment</span>
                  <span className="capitalize">{payment.method}</span>
                </div>
                {payment.method === 'cash' && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Cash received</span>
                      <span>{formatMMK(payment.cash_tendered)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-green-700">
                      <span>Change</span>
                      <span>{formatMMK(payment.change_given)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Staff */}
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                Served by {session?.staffName}
              </p>
              <p className="text-xs text-gray-400 text-center mt-1">
                Thank you for shopping at SoleSpace!
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition-colors"
          >
            {printed
              ? <><CheckCircle2 size={16} /> Printed</>
              : <><Printer size={16} /> Print Receipt</>
            }
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag size={16} />
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
