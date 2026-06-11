export default function Spinner({ size = 'md', color = 'white' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  const colors = {
    white: 'border-white border-t-transparent',
    blue: 'border-blue-600 border-t-transparent',
    gray: 'border-gray-400 border-t-transparent',
  }
  return (
    <div
      className={`${sizes[size]} ${colors[color]} border-2 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}
