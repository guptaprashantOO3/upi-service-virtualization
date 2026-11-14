/**
 * Format currency in INR format (₹ 1,000.00)
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '₹ 0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format nanoseconds into human-friendly milliseconds or seconds
 */
export function formatLatency(nanos) {
  if (nanos === undefined || nanos === null || isNaN(Number(nanos))) {
    return '0.00 ms'
  }
  const ms = Number(nanos) / 1_000_000
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`
  }
  return `${ms.toFixed(2)} ms`
}

/**
 * Format date time
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return String(dateInput)
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true,
  }).format(date)
}

/**
 * Generate a random idempotency key for testing
 */
export function generateIdempotencyKey() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `IDEMP-${timestamp}-${random}`.toUpperCase()
}

