// Myanmar Kyat currency formatter
export function formatMMK(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount)) + ' MMK'
}

// Short version for tight spaces
export function formatMMKShort(amount) {
  return 'K ' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}
