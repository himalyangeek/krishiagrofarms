import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabaseClient'
import { formatAddress } from '../lib/address'

export default function Profile() {
  const { user, changePassword } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [reorderingId, setReorderingId] = useState(null)
  const [reorderNotice, setReorderNotice] = useState({})

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwSubmitting, setPwSubmitting] = useState(false)

  useEffect(() => {
    async function loadOrders() {
      const { data, error } = await supabase.rpc('get_my_orders', { p_user_id: user.userID })
      if (!error) setOrders(data || [])
      setLoadingOrders(false)
    }
    loadOrders()
  }, [user.userID])

  async function handleReorder(order) {
    const basket = order.productBasket || []
    if (basket.length === 0) return

    setReorderingId(order.orderID)
    setReorderNotice((n) => ({ ...n, [order.orderID]: '' }))
    try {
      const productIDs = basket.map((i) => i.productID)
      const { data: currentProducts, error } = await supabase
        .from('Product')
        .select('*')
        .in('productID', productIDs)
      if (error) throw new Error(error.message)

      const byId = new Map((currentProducts || []).map((p) => [p.productID, p]))
      let addedCount = 0
      let skipped = 0

      for (const item of basket) {
        const product = byId.get(item.productID)
        if (!product || product.currentStock <= 0) {
          skipped += 1
          continue
        }
        const quantity = Math.min(item.quantity, product.currentStock)
        addItem(product, quantity)
        addedCount += 1
      }

      if (addedCount === 0) {
        setReorderNotice((n) => ({ ...n, [order.orderID]: 'None of these products are available anymore.' }))
      } else if (skipped > 0) {
        setReorderNotice((n) => ({
          ...n,
          [order.orderID]: `Added ${addedCount} item(s) to your basket. ${skipped} item(s) are no longer available.`,
        }))
      } else {
        navigate('/checkout')
      }
    } catch (err) {
      setReorderNotice((n) => ({ ...n, [order.orderID]: err.message }))
    } finally {
      setReorderingId(null)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }
    setPwSubmitting(true)
    try {
      await changePassword(oldPassword, newPassword)
      setPwSuccess('Password updated successfully.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">My profile</h1>

      <div className="card mt-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf-500">Name</p>
          <p className="text-leaf-900">
            {user.firstName} {user.lastName}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf-500">Email</p>
          <p className="text-leaf-900">{user.email || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf-500">Password</p>
          <p className="text-leaf-900">{user.hasPassword ? '••••••••' : 'Not set'}</p>
        </div>
      </div>

      {!user.hasPassword && (
        <div className="card mt-6 p-5">
          <h2 className="font-semibold text-leaf-900">You're signed in with Google</h2>
          <p className="mt-1 text-sm text-leaf-600">
            Want to also log in with a password? Go to{' '}
            <Link to="/register" className="font-semibold text-leaf-800 underline">
              create an account
            </Link>{' '}
            and use this same email ({user.email}) — it'll add a password to this account instead of making a
            new one.
          </p>
        </div>
      )}

      {user.hasPassword && (
        <div className="card mt-6 p-5">
          <h2 className="font-semibold text-leaf-900">Change password</h2>
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <input
              className="input-field"
              type="password"
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
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
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-leaf-700">{pwSuccess}</p>}
            <button type="submit" disabled={pwSubmitting} className="btn-primary">
              {pwSubmitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-leaf-900">Order history</h2>
        {loadingOrders && <p className="mt-3 text-sm text-leaf-500">Loading orders…</p>}
        {!loadingOrders && orders.length === 0 && (
          <p className="mt-3 text-sm text-leaf-500">You haven't placed any orders yet.</p>
        )}
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <div key={order.orderID} className="rounded-xl border border-leaf-100 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-leaf-500">{order.orderID}</span>
                <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
                  {order.orderStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-leaf-600">
                {order.orderDate ? new Date(order.orderDate).toLocaleString() : ''}
              </p>
              <p className="mt-1 text-sm text-leaf-700">Delivering to: {formatAddress(order.deliveryAddress)}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-leaf-600">
                  {order.paymentStatus} · {(order.productBasket || []).length} item(s)
                </span>
                <span className="font-display font-semibold text-leaf-800">
                  ₹{Number(order.billAmount || 0).toFixed(0)}
                </span>
              </div>
              <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                {reorderNotice[order.orderID] && (
                  <p className="text-xs text-leaf-600">{reorderNotice[order.orderID]}</p>
                )}
                <button
                  onClick={() => handleReorder(order)}
                  disabled={reorderingId === order.orderID}
                  className="btn-secondary !px-4 !py-2 text-xs sm:ml-auto"
                >
                  {reorderingId === order.orderID ? 'Adding…' : 'Reorder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
