import React from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="relative flex items-center">
      <Search size={18} className="absolute left-3.5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={function(e) { onChange(e.target.value) }}
        placeholder="Search or scan barcode..."
        className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-800 text-base outline-none focus:ring-2 focus:ring-slate-300"
        autoFocus
      />
      {value ? (
        <button
          onClick={onClear}
          className="absolute right-3.5 text-gray-400 p-1"
        >
          <X size={18} />
        </button>
      ) : null}
    </div>
  )
}
