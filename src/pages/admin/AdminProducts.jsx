import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from './AdminLayout'
import { formatMMK } from '../../lib/currency'

const STORE_ID = 'a0000000-0000-0000-0000-000000000001'

export default function AdminProducts() {
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editVariant, setEditVariant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    productName: '',
    sku: '',
    barcode: '',
    size: '',
    color: '',
    price: '',
    costPrice: '',
    imageUrl: '',
  })

  useEffect(function() { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, sku, barcode, size, color, price, cost_price, is_active, products ( id, name, gender, image_url )')
      .order('created_at', { ascending: false })
    setVariants(data || [])
    setLoading(false)
  }

  const filtered = variants.filter(function(v) {
    const q = search.toLowerCase()
    const name = v.products ? v.products.name.toLowerCase() : ''
    return name.includes(q) || v.sku.toLowerCase().includes(q) || v.color.toLowerCase().includes(q)
  })

  function openNew() {
    setEditVariant(null)
    setForm({ productName: '', sku: '', barcode: '', size: '', color: '', price: '', costPrice: '', imageUrl: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowForm(true)
    setMsg('')
  }

  function openEdit(v) {
    setEditVariant(v)
    setForm({
      productName: v.products ? v.products.name : '',
      sku: v.sku,
      barcode: v.barcode || '',
      size: v.size,
      color: v.color,
      price: String(v.price),
      costPrice: String(v.cost_price || ''),
      imageUrl: v.products ? (v.products.image_url || '') : '',
    })
    setImageFile(null)
    setImagePreview(v.products ? v.products.image_url : null)
    setShowForm(true)
    setMsg('')
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(productId) {
    if (!imageFile) return null
    setUploading(true)
    const ext = imageFile.name.split('.').pop()
    const path = 'products/' + productId + '.' + ext
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, imageFile, { upsert: true })
    setUploading(false)
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.productName || !form.sku || !form.size || !form.color || !form.price) {
      setMsg('Please fill all required fields.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      if (editVariant) {
        let imageUrl = form.imageUrl
        if (imageFile && editVariant.products) {
          const uploaded = await uploadImage(editVariant.products.id)
          if (uploaded) imageUrl = uploaded
        }
        await supabase
          .from('product_variants')
          .update({
            sku: form.sku,
            barcode: form.barcode || null,
            size: form.size,
            color: form.color,
            price: parseFloat(form.price),
            cost_price: form.costPrice ? parseFloat(form.costPrice) : null,
          })
          .eq('id', editVariant.id)
        if (editVariant.products) {
          await supabase
            .from('products')
            .update({ image_url: imageUrl })
            .eq('id', editVariant.products.id)
        }
        setMsg('Updated successfully.')
      } else {
        const { data: prod } = await supabase
          .from('products')
          .insert({ name: form.productName, gender: 'unisex', is_active: true })
          .select()
          .single()

        if (prod) {
          let imageUrl = null
          if (imageFile) {
            imageUrl = await uploadImage(prod.id)
          }
          if (imageUrl) {
            await supabase.from('products').update({ image_url: imageUrl }).eq('id', prod.id)
          }

          const { data: variant } = await supabase
            .from('product_variants')
            .insert({
              product_id: prod.id,
              sku: form.sku,
              barcode: form.barcode || null,
              size: form.size,
              color: form.color,
              price: parseFloat(form.price),
              cost_price: form.costPrice ? parseFloat(form.costPrice) : null,
              is_active: true,
            })
            .select()
            .single()

          if (variant) {
            await supabase.from('inventory').insert({
              variant_id: variant.id,
              store_id: STORE_ID,
              qty_on_hand: 0,
              reorder_point: 5,
            })
          }
        }
        setMsg('Product created. Go to Inventory to set stock quantity.')
      }
      loadData()
      setShowForm(false)
    } catch (e) {
      setMsg('Error: ' + e.message)
    }
    setSaving(false)
  }

  async function toggleActive(v) {
    await supabase.from('product_variants').update({ is_active: !v.is_active }).eq('id', v.id)
    loadData()
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Products</h2>
            <p className="text-sm text-gray-400">{variants.length} total variants</p>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700"
          >
            + Add Product
          </button>
        </div>

        {msg ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 text-sm">{msg}</div>
        ) : null}

        {showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">
              {editVariant ? 'Edit Variant' : 'Add New Product'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">Product Name *</label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={function(e) { setForm(Object.assign({}, form, { productName: e.target.value })) }}
                  disabled={!!editVariant}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-gray-50"
                  placeholder="e.g. Air Max 270"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">SKU *</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={function(e) { setForm(Object.assign({}, form, { sku: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. NK-AM270-BLK-9"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Barcode</label>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={function(e) { setForm(Object.assign({}, form, { barcode: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. 8801000000001"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Size *</label>
                <input
                  type="text"
                  value={form.size}
                  onChange={function(e) { setForm(Object.assign({}, form, { size: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. 9"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Color *</label>
                <input
                  type="text"
                  value={form.color}
                  onChange={function(e) { setForm(Object.assign({}, form, { color: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. Black"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Price (MMK) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={function(e) { setForm(Object.assign({}, form, { price: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. 250000"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Cost Price (MMK)</label>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={function(e) { setForm(Object.assign({}, form, { costPrice: e.target.value })) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="e.g. 120000"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 block mb-1">
                  Product Image (optional)
                </label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-2xl">
                      👟
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG or WEBP. Max 2MB.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={function() { setShowForm(false) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading image...' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search by name, SKU or color..."
              value={search}
              onChange={function(e) { setSearch(e.target.value) }}
              className="w-full text-sm outline-none text-gray-800 placeholder-gray-400"
            />
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Image</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">SKU</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Color</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(function(v) {
                    const imgUrl = v.products ? v.products.image_url : null
                    return (
                      <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt="product"
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                              👟
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-800">
                          {v.products ? v.products.name : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{v.sku}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{v.size}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{v.color}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-900">{formatMMK(v.price)}</td>
                        <td className="px-4 py-3">
                          <span className={
                            'text-xs px-2 py-0.5 rounded-full font-medium ' +
                            (v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')
                          }>
                            {v.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={function() { openEdit(v) }} className="text-xs text-blue-600 hover:underline">
                              Edit
                            </button>
                            <button onClick={function() { toggleActive(v) }} className="text-xs text-gray-500 hover:underline">
                              {v.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
