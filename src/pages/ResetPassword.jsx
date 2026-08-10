import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is missing its token — please use the link from your email.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-3xl">
          ✓
        </div>
        <h1 className="font-display text-2xl font-semibold text-leaf-900">Password updated</h1>
        <p className="mt-2 text-leaf-600">Taking you to the login page…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Set a new password</h1>
      {!token && (
        <p className="mt-1 text-sm text-red-600">
          No reset token found in this link. Please use the "Reset my password" link from your email.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          className="input-field"
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-leaf-600">
        <Link to="/login" className="font-semibold text-leaf-800 underline">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
