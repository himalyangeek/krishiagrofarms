import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Login() {
  const { login, loginWithGoogle, requestPasswordReset } = useAuth()
  const { clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetError, setResetError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const dest = location.state?.from?.pathname || '/'
      // Reset any leftover basket from a previous session/account — but not
      // if we're bouncing them back to checkout with items they just added.
      if (dest !== '/checkout') {
        clearCart()
      }
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      // Browser redirects to Google here; nothing left to do on this page.
    } catch (err) {
      setGoogleError(err.message)
      setGoogleLoading(false)
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setResetError('')
    setResetMessage('')
    setResetSubmitting(true)
    try {
      await requestPasswordReset(resetEmail)
      setResetMessage('If that email is registered, a reset link is on its way — check your inbox.')
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetSubmitting(false)
    }
  }

  if (showForgot) {
    return (
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <h1 className="font-display text-2xl font-semibold text-leaf-900">Reset your password</h1>
        <p className="mt-1 text-leaf-600">Enter your email and we'll send you a reset link.</p>

        <form onSubmit={handleForgotSubmit} className="mt-6 space-y-4">
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          {resetMessage && <p className="text-sm text-leaf-700">{resetMessage}</p>}
          <button type="submit" disabled={resetSubmitting} className="btn-primary w-full">
            {resetSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <button
          onClick={() => setShowForgot(false)}
          className="mt-6 text-center text-sm font-semibold text-leaf-700 underline"
        >
          Back to log in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Welcome back</h1>
      <p className="mt-1 text-leaf-600">Log in with your email and password.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="block text-sm font-semibold text-leaf-700 underline"
        >
          Forgot password?
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-leaf-400">
        <span className="h-px flex-1 bg-leaf-200" />
        or
        <span className="h-px flex-1 bg-leaf-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="btn-secondary w-full"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.36-1.6-5.08-3.74H.9v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.92 10.68A5.4 5.4 0 0 1 3.64 9c0-.58.1-1.15.28-1.68V4.99H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.01l3.02-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .9 4.99l3.02 2.33C4.64 5.18 6.64 3.58 9 3.58z"
          />
        </svg>
        {googleLoading ? 'Redirecting…' : 'Continue with Google'}
      </button>
      {googleError && <p className="mt-2 text-sm text-red-600">{googleError}</p>}

      <p className="mt-6 text-center text-sm text-leaf-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-leaf-800 underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
