import React from 'react'
import { formatMMK } from '../../lib/currency'

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-700',
  voided:    'bg-red-100 text-red-700',
  refunded:  'bg-yellow-100 text-yellow-700',
  pending:   'bg-gray-100 text-gray-600',
}

export default function RecentTransactions({ transactions, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Recent Transactions</h3>
        <span className="text-xs text-gray-400">{transactions.length} today</span>
      </div>
      {transactions.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">
          No transactions today yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Ref</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Staff</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Method</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{txn.ref_number}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {new Date(txn.completed_at).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-700">
                    {txn.staff?.full_name || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs capitalize text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {txn.payments?.[0]?.method || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs capitalize px-2 py-0.5 rounded-full font-medium
                      ${STATUS_STYLES[txn.status] || STATUS_STYLES.pending}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs font-bold text-gray-900">
                    {formatMMK(txn.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
