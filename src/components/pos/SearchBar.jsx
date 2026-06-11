import React, { useRef } from 'react'
import { Search, ScanLine, X } from 'lucide-react'

export default function SearchBar({ value, onChange, onClear }) {
  const inputRef = useRef(null)

  return (
    <div className="relative flex items-center">
      <div className="absolute left-3 text-gray-400">
        {value.startsWith('88')
          ? <ScanLine size={18} />
          : <Search size={18} />
        }
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, SKU or scan barcode..."
        className="
          w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200
          bg-white text-gray-800 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          placeholder-gray-400
        "
        autoFocus
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
