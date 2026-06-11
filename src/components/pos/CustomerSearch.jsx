import React, { useState } from 'react'
import { Search, UserPlus, X, User, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSale } from '../../context/SaleContext'
import Spinner from '../ui/Spinner'

export default function CustomerSearch() {
  const { customer, setCustomer } = useSale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function searchCustomers(q) {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, full_name, phone, visit_count, lifetime_spend')
        .or(`phone.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(5)
      setResults(data || [])
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(c) {
    setCustomer(c)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function handleRemove() {
    setCustomer(null)
  }

  async function handleCreateCustomer() {
    if (!newName.trim() || !newPhone.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          full_name: newName.trim(),
          phone: newPhone.trim(),
        })
        .select()
        .single()
      if (!error && data) {
        handleSelect(data)
        setShowNew(false)
        setNewName('')
        setNewPhone('')
      }
    } finally {
      setSaving(false)
    }
  }

  // Customer already selected
  if (customer) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
        <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={13} className="text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-900 truncate">
            {customer.full_name}
          </p>
          <p className="text-xs text-blue-600">{customer.phone}</p>
        </div>
        <button
          onClick={handleRemove}
          className="text-blue-400 hover:text-blue-700 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 text-xs transition-colors"
        >
          <User size={14} />
          Add customer (optional)
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or phone..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                searchCustomers(e.target.value)
              }}
              className="flex-1 text-xs outline-none text-gray-800 placeholder-gray-400"
            />
            <button onClick={() => setOpen(false)} className="text-gray-400">
              <X size={14} />
            </button>
          </div>

          {/* Results */}
          {loading && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" color="gray" />
            </div>
          )}
          {!loading && results.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left"
            >
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800">{c.full_name}</p>
                <p className="text-xs text-gray-400">{c.phone} · {c.visit_count} visits</p>
              </div>
            </button>
          ))}

          {/* Create new */}
          {!showNew ? (
            <button
              onClick={() => setShowNew(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <UserPlus size={13} />
              Create new customer
            </button>
          ) : (
            <div className="p-3 border-t border-gray-100 space-y-2">
              <input
                type="text"
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNew(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={saving || !newName || !newPhone}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 hover:bg-slate-700 flex items-center justify-center gap-1"
                >
                  {saving ? <Spinner size="sm" color="white" /> : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
