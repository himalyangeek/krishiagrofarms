import { useEffect, useState } from 'react'
import { isValidIndianMobile } from '../lib/validation'
import { lookupPincode } from '../lib/pincodeLookup'
import LocationHelpModal from './LocationHelpModal'
import StateCitySelect from './StateCitySelect'

const LAST_MOBILE_KEY = 'agro-store:lastMobile'

export default function AddressModal({ initialAddress, onSave, onClose }) {
  const [line1, setLine1] = useState(initialAddress?.line1 || '')
  const [line2, setLine2] = useState(initialAddress?.line2 || '')
  const [state, setState] = useState(initialAddress?.state || '')
  const [city, setCity] = useState(initialAddress?.city || '')
  const [mobile, setMobile] = useState(
    initialAddress?.mobile || localStorage.getItem(LAST_MOBILE_KEY) || ''
  )
  const [pincode, setPincode] = useState(initialAddress?.pincode || '')
  const [pincodeError, setPincodeError] = useState('')
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '')
  const [coords, setCoords] = useState(initialAddress?.coords || null)
  // locating | granted | error | unsupported
  const [locStatus, setLocStatus] = useState('locating')
  const [showLocationHelp, setShowLocationHelp] = useState(false)
  const [error, setError] = useState('')

  // Cross-checks whatever combination of state/city/pincode is currently set.
  // Called after every change to any of the three so mismatches surface
  // immediately, regardless of which field the user filled in first.
  async function checkConsistency(nextPincode, nextState, nextCity) {
    if (nextPincode.length !== 6) {
      setPincodeError('')
      return
    }
    const loc = await lookupPincode(nextPincode)
    if (!loc) {
      setPincodeError('')
      return
    }
    if (nextState && nextState !== loc.state) {
      setPincodeError(`Pincode ${nextPincode} belongs to ${loc.city}, ${loc.state} — not ${nextState}.`)
      return
    }
    if (nextCity && nextCity !== loc.city) {
      setPincodeError(`Pincode ${nextPincode} belongs to ${loc.city}, ${loc.state} — not ${nextCity}.`)
      return
    }
    setPincodeError('')
  }

  async function handlePincodeChange(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setPincode(digits)
    if (digits.length === 6) {
      const loc = await lookupPincode(digits)
      if (loc && (!state || state === loc.state) && (!city || city === loc.city)) {
        setState(loc.state)
        setCity(loc.city)
      }
    }
    checkConsistency(digits, state, city)
  }

  function handleStateChange(nextState) {
    setState(nextState)
    setCity('')
    checkConsistency(pincode, nextState, '')
  }

  function handleCityChange(nextCity) {
    setCity(nextCity)
    checkConsistency(pincode, state, nextCity)
  }

  useEffect(() => {
    fetchLocation()
  }, [])

  function fetchLocation() {
    if (!('geolocation' in navigator)) {
      setLocStatus('unsupported')
      setShowLocationHelp(true)
      return
    }
    setLocStatus('locating')
    setShowLocationHelp(false)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocStatus('granted')
        setShowLocationHelp(false)
      },
      () => {
        setLocStatus('error')
        setShowLocationHelp(true)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handleSave() {
    if (locStatus !== 'granted' || !coords) {
      setError('We need your location to confirm delivery — please enable location access.')
      setShowLocationHelp(true)
      return
    }
    if (!line1.trim() || !state || !city || !pincode.trim() || !mobile.trim()) {
      setError('Address line 1, state, city, pincode, and contact mobile number are required.')
      return
    }
    if (!/^\d{4,6}$/.test(pincode.trim())) {
      setError('Enter a valid pincode.')
      return
    }
    if (pincodeError) {
      setError(pincodeError)
      return
    }
    if (!isValidIndianMobile(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number (starting 6-9).')
      return
    }
    setError('')
    localStorage.setItem(LAST_MOBILE_KEY, mobile.trim())
    onSave({
      line1: line1.trim(),
      line2: line2.trim(),
      state,
      city,
      pincode: pincode.trim(),
      landmark: landmark.trim(),
      mobile: mobile.trim(),
      coords,
    })
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-leaf-900">Delivery address</h2>
          <button onClick={onClose} className="text-leaf-500" aria-label="Close">
            ✕
          </button>
        </div>

        {locStatus === 'locating' && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-leaf-500" />
            Confirming your location for delivery…
          </p>
        )}
        {locStatus === 'granted' && (
          <p className="mb-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-700">
            ✓ Location confirmed for delivery.
          </p>
        )}
        {(locStatus === 'error' || locStatus === 'unsupported') && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>Location access is required to save this address.</span>
            <button onClick={() => setShowLocationHelp(true)} className="shrink-0 font-semibold underline">
              How do I enable it?
            </button>
          </div>
        )}

        <div className="space-y-3">
          <input
            className="input-field"
            placeholder="Address line 1 *"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Address line 2"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="Pincode *"
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            inputMode="numeric"
            maxLength={6}
          />
          {pincodeError && <p className="text-sm text-red-600">{pincodeError}</p>}
          <StateCitySelect state={state} city={city} onStateChange={handleStateChange} onCityChange={handleCityChange} />
          <input
            className="input-field"
            placeholder="Landmark"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
          <input
            className="input-field"
            type="tel"
            placeholder="Contact mobile number *"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            inputMode="numeric"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <button
          onClick={handleSave}
          disabled={locStatus !== 'granted'}
          className="btn-primary mt-5 w-full"
        >
          Save address
        </button>
      </div>
    </div>

    {showLocationHelp && (
      <LocationHelpModal
        onRetry={fetchLocation}
        onClose={() => setShowLocationHelp(false)}
      />
    )}
    </>
  )
}
