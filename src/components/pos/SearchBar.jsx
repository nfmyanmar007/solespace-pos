import React from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="relative flex items-center">
      <Search size={17} className="absolute left-3 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={function(e) { onChange(e.target.value) }}
        placeholder="Search or scan barcode..."
        className="w-full pl-10 pr-9 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white"
        autoFocus
      />
      {value ? (
        <button onClick={onClear} className="absolute right-3 text-gray-400 p-1">
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}
