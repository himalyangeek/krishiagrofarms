// Lazy-loaded: this ~250KB dataset should only be fetched when someone
// actually opens an address form, not bundled into every page's initial load.
let dataPromise = null
function loadData() {
  if (!dataPromise) {
    dataPromise = import('./pincodeData.json').then((m) => m.default)
  }
  return dataPromise
}

// pincodeData is stored compactly as { locations: [[state, city], ...], pincodes: { "110001": <index into locations> } }
// to avoid repeating full state/city strings for each of India's ~19,000 pincodes.
export async function lookupPincode(pincode) {
  const data = await loadData()
  const idx = data.pincodes[pincode]
  if (idx === undefined) return null
  const [state, city] = data.locations[idx]
  return { state, city }
}
