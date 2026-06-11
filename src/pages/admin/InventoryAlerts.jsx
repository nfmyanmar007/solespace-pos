import React from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'

export default function InventoryAlerts({ alerts, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Inventory Alerts</h3>
        {alerts.length > 0 && (
          <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {alerts.length} items
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-gray-400 text-sm">All stock levels are healthy</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                ${alert.qty === 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                {alert.qty === 0
                  ? <XCircle size={14} className="text-red-600" />
                  : <AlertTriangle size={14} className="text-yellow-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">
                  {alert.productName}
                </p>
                <p className="text-xs text-gray-400">
                  Sz {alert.size} · {alert.color} · {alert.sku}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${alert.qty === 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                  {alert.qty === 0 ? 'Out of stock' : `${alert.qty} left`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
