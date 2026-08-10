import { useEffect, useState } from 'react'
import { isValidIndianMobile } from '../lib/validation'
import LocationHelpModal from './LocationHelpModal'

export default function AddressModal({ initialAddress, onSave, onClose }) {
  const [line1, setLine1] = useState(initialAddress?.line1 || '')
  const [line2, setLine2] = useState(initialAddress?.line2 || '')
  const [city, setCity] = useState(initialAddress?.city || '')
  const [mobile, setMobile] = useState(initialAddress?.mobile || '')
  const [pincode, setPincode] = useState(initialAddress?.pincode || '')
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '')
  const [coords, setCoords] = useState(initialAddress?.coords || null)
  // locating | granted | error | unsupported
  const [locStatus, setLocStatus] = useState('locating')
  const [showLocationHelp, setShowLocationHelp] = useState(false)
  const [error, setError] = useState('')

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
    if (!line1.trim() || !city.trim() || !pincode.trim() || !mobile.trim()) {
      setError('Address line 1, city, pincode, and contact mobile number are required.')
      return
    }
    if (!/^\d{4,6}$/.test(pincode.trim())) {
      setError('Enter a valid pincode.')
      return
    }
    if (!isValidIndianMobile(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number (starting 6-9).')
      return
    }
    setError('')
    onSave({
      line1: line1.trim(),
      line2: line2.trim(),
      city: city.trim(),
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
          <div className="flex gap-3">
            <input
              className="input-field"
              placeholder="City *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Pincode *"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              inputMode="numeric"
            />
          </div>
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
