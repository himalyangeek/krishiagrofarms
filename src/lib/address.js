export function parseAddress(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function formatAddress(raw) {
  const a = parseAddress(raw)
  if (!a) return raw || '—'
  return [
    a.line1,
    a.line2,
    a.city,
    a.pincode,
    a.landmark ? `near ${a.landmark}` : null,
    a.mobile ? `contact ${a.mobile}` : null,
  ]
    .filter(Boolean)
    .join(', ')
}
