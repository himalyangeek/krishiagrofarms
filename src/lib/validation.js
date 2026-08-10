// Indian mobile numbers: 10 digits, first digit 6-9.
const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/

export function isValidIndianMobile(value) {
  return INDIAN_MOBILE_RE.test(String(value || '').trim())
}
