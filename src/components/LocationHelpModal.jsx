function detectPlatform() {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'desktop'
}

const STEPS = {
  android: [
    'Tap the lock/info icon (🔒 or ⓘ) at the left of your browser\'s address bar.',
    'Tap "Permissions" → "Location" and set it to "Allow".',
    'If you don\'t see that option, open your phone\'s Settings → Apps → your browser (e.g. Chrome) → Permissions → Location → Allow.',
    'Also make sure Location/GPS is turned on for your phone: Settings → Location → On.',
    'Come back here and tap "Try again" below.',
  ],
  ios: [
    'Open iPhone Settings → Privacy & Security → Location Services, and make sure it\'s turned On.',
    'Scroll down to your browser (Safari/Chrome) and set it to "While Using the App".',
    'Come back here and tap "Try again" below.',
  ],
  desktop: [
    'Click the location or lock icon in your browser\'s address bar.',
    'Set the "Location" permission for this site to "Allow".',
    'Reload the page if needed, then click "Try again" below.',
  ],
}

const TITLES = {
  android: 'Enable location on Android',
  ios: 'Enable location on iPhone',
  desktop: 'Enable location in your browser',
}

export default function LocationHelpModal({ onRetry, onClose }) {
  const platform = detectPlatform()

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-leaf-900/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-cream p-6 shadow-soft sm:rounded-3xl">
        <h2 className="font-display text-xl font-semibold text-leaf-900">{TITLES[platform]}</h2>
        <p className="mt-2 text-sm text-leaf-600">
          We need your location to confirm delivery, and it's currently blocked. Here's how to turn it on:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-leaf-800">
          {STEPS[platform].map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <div className="mt-6 flex gap-3">
          <button onClick={onRetry} className="btn-primary flex-1">
            Try again
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
