// One-off build script: reduces the raw India Post pincode dump
// (pincodes.json, ~18MB, 154k post-office records) down to two small files:
//   1. src/lib/indiaStatesCities.json — merged/deduped with postal districts
//      so every pincode-derived city is guaranteed to exist as a dropdown option.
//   2. src/lib/pincodeData.json — compact pincode -> {state, city} lookup.
// Not part of the app build; run manually with `node scripts/build-pincode-data.cjs`.

const fs = require('fs')
const path = require('path')

const RAW_PATH = path.join(__dirname, '../pincodes.json')
const CITIES_PATH = path.join(__dirname, '../src/lib/indiaStatesCities.json')
const OUT_PINCODE_PATH = path.join(__dirname, '../src/lib/pincodeData.json')

// Raw data uses ALL-CAPS / different naming than our curated state keys.
const STATE_NORMALIZE = {
  'ANDAMAN & NICOBAR ISLANDS': 'Andaman and Nicobar Islands',
  'ANDHRA PRADESH': 'Andhra Pradesh',
  'ARUNACHAL PRADESH': 'Arunachal Pradesh',
  ASSAM: 'Assam',
  BIHAR: 'Bihar',
  CHANDIGARH: 'Chandigarh',
  CHATTISGARH: 'Chhattisgarh',
  'DADRA & NAGAR HAVELI': 'Dadra and Nagar Haveli',
  'DAMAN & DIU': 'Daman and Diu',
  DELHI: 'Delhi',
  GOA: 'Goa',
  GUJARAT: 'Gujarat',
  HARYANA: 'Haryana',
  'HIMACHAL PRADESH': 'Himachal Pradesh',
  'JAMMU & KASHMIR': 'Jammu and Kashmir',
  JHARKHAND: 'Jharkhand',
  KARNATAKA: 'Karnataka',
  KERALA: 'Kerala',
  LAKSHADWEEP: 'Lakshadweep',
  'MADHYA PRADESH': 'Madhya Pradesh',
  MAHARASHTRA: 'Maharashtra',
  MANIPUR: 'Manipur',
  MEGHALAYA: 'Meghalaya',
  MIZORAM: 'Mizoram',
  NAGALAND: 'Nagaland',
  ODISHA: 'Odisha',
  PONDICHERRY: 'Puducherry',
  PUNJAB: 'Punjab',
  RAJASTHAN: 'Rajasthan',
  SIKKIM: 'Sikkim',
  'TAMIL NADU': 'Tamil Nadu',
  TRIPURA: 'Tripura',
  'UTTAR PRADESH': 'Uttar Pradesh',
  UTTARAKHAND: 'Uttarakhand',
  'WEST BENGAL': 'West Bengal',
}
// Note: this India Post dataset predates the 2014 AP/Telangana split, so
// Telangana districts (e.g. Adilabad) appear under "ANDHRA PRADESH" here.
// No authoritative fix available from this source alone — flagging, not guessing.

console.log('Reading raw pincode data...')
const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
console.log(`  ${raw.length} records`)

// Group by pincode, resolve conflicts (a pincode spanning >1 district in the
// source) by majority vote among that pincode's own records.
const byPincode = new Map()
for (const rec of raw) {
  const state = STATE_NORMALIZE[rec.stateName]
  if (!state || !rec.pincode || !rec.districtName) continue
  const key = String(rec.pincode).padStart(6, '0')
  const pairKey = `${state}|${rec.districtName.trim()}`
  if (!byPincode.has(key)) byPincode.set(key, new Map())
  const counts = byPincode.get(key)
  counts.set(pairKey, (counts.get(pairKey) || 0) + 1)
}

const resolved = new Map() // pincode -> [state, district]
for (const [pincode, counts] of byPincode) {
  let best = null
  let bestCount = -1
  for (const [pairKey, count] of counts) {
    if (count > bestCount) {
      best = pairKey
      bestCount = count
    }
  }
  const sep = best.indexOf('|')
  resolved.set(pincode, [best.slice(0, sep), best.slice(sep + 1)])
}
console.log(`  ${resolved.size} unique pincodes resolved`)

// Merge every postal district into the curated city list so an auto-filled
// city from a pincode is always a valid, selectable option — union + dedupe
// case-insensitively, keeping the curated spelling when it already exists.
const cities = JSON.parse(fs.readFileSync(CITIES_PATH, 'utf8'))

// Fold the pre-existing "Himachal Praddesh" typo key into "Himachal Pradesh".
if (cities['Himachal Praddesh']) {
  cities['Himachal Pradesh'] = [...new Set([...cities['Himachal Pradesh'], ...cities['Himachal Praddesh']])]
  delete cities['Himachal Praddesh']
}

const canonicalCity = new Map() // "state|lowercase district" -> canonical spelling used in cities json

function addCity(state, city) {
  if (!cities[state]) cities[state] = []
  const existing = cities[state].find((c) => c.toLowerCase() === city.toLowerCase())
  if (existing) return existing
  cities[state].push(city)
  return city
}

for (const [state, district] of resolved.values()) {
  const lookupKey = `${state}|${district.toLowerCase()}`
  if (!canonicalCity.has(lookupKey)) {
    canonicalCity.set(lookupKey, addCity(state, district))
  }
}

for (const state of Object.keys(cities)) {
  cities[state].sort((a, b) => a.localeCompare(b))
}

fs.writeFileSync(CITIES_PATH, JSON.stringify(cities, null, 2) + '\n')
console.log(`  Updated ${CITIES_PATH} — now ${Object.keys(cities).length} states`)

// Compact pincode map: a small "locations" table of unique [state, city]
// pairs, and pincode -> index into that table (instead of repeating full
// strings per pincode).
const locations = []
const locationIndex = new Map() // "state|city" -> index
function locationIdx(state, city) {
  const key = `${state}|${city}`
  if (!locationIndex.has(key)) {
    locationIndex.set(key, locations.length)
    locations.push([state, city])
  }
  return locationIndex.get(key)
}

const pincodes = {}
for (const [pincode, [state, district]] of resolved) {
  const city = canonicalCity.get(`${state}|${district.toLowerCase()}`)
  pincodes[pincode] = locationIdx(state, city)
}

const output = { locations, pincodes }
fs.writeFileSync(OUT_PINCODE_PATH, JSON.stringify(output))

const outSize = fs.statSync(OUT_PINCODE_PATH).size
const rawSize = fs.statSync(RAW_PATH).size
console.log(`  ${locations.length} unique (state, city) pairs`)
console.log(`  Wrote ${OUT_PINCODE_PATH}`)
console.log(`  Size: ${(rawSize / 1024 / 1024).toFixed(2)} MB -> ${(outSize / 1024).toFixed(1)} KB`)
