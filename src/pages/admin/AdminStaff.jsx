import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ fullName: '', pin: '', role: 'cashier' })

  useEffect(function() { loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('store_id', STORE_ID)
      .order('full_name')
    setStaff(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditStaff(null)
    setForm({ fullName: '', pin: '', role: 'cashier' })
    setShowForm(true)
    setMsg('')
  }

  function openEdit(s) {
    setEditStaff(s)
    setForm({ fullName: s.full_name, pin: '', role: s.role })
    setShowForm(true)
    setMsg('')
  }

  async function handleSave() {
    if (!form.fullName) { setMsg('Name is required.'); return }
    if (!editStaff && !form.pin) { setMsg('PIN is required for new staff.'); return }
    if (form.pin && (form.pin.length < 4 || form.pin.length > 6)) {
      setMsg('PIN must be 4 to 6 digits.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      if (editStaff) {
        const updates = { full_name: form.fullName, role: form.role }
        if (form.pin) updates.pin_hash = form.pin
        await supabase.from('staff').update(updates).eq('id', editStaff.id)
        setMsg('Staff updated successfully.')
      } else {
        await supabase.from('staff').insert({
          store_id: STORE_ID,
          full_name: form.fullName,
          pin_hash: form.pin,
          role: form.role,
          is_active: true,
        })
        setMsg('Staff created successfully.')
      }
      loadStaff()
      setShowForm(false)
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setSaving(false)
  }

  async function toggleActive(s) {
    await supabase.from('staff').update({ is_active: !s.is_active }).eq('id', s.id)
    loadStaff()
  }

  const roleColors = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-purple-100 text-purple-700',
    senior: 'bg-blue-100 text-blue-700',
    cashier: 'bg-green-100 text-green-700',
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Staff</h2>
            <p className="text-sm text-gray-400">{staff.length} staff members</p>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700"
          >
            + Add Staff
          </button>
        </div>

        {msg ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">
            {msg}
          </div>
        ) : null}

        {showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">
              {editStaff ? 'Edit Staff Member' : 'Add New Staff'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={function(e) { setForm(Object.assign({}, form, { fullName: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  PIN {editStaff ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={function(e) { setForm(Object.assign({}, form, { pin: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={function(e) { setForm(Object.assign({}, form, { role: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="cashier">Cashier</option>
                  <option value="senior">Senior Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={function() { setShowForm(false) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {staff.map(function(s) {
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.full_name}</p>
                      <p className="text-xs text-gray-400">
                        Last login: {s.last_login ? new Date(s.last_login).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium capitalize ' + (roleColors[s.role] || 'bg-gray-100 text-gray-600')}>
                      {s.role}
                    </span>
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={function() { openEdit(s) }} className="text-xs text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={function() { toggleActive(s) }} className="text-xs text-gray-500 hover:underline">
                        {s.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
