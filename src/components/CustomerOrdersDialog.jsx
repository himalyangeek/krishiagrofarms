import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatAddress, parseAddress } from '../lib/address'
import { isValidIndianMobile } from '../lib/validation'
import { useAuth } from '../context/AuthContext'
import StateCitySelect from './StateCitySelect'

const STATUS_OPTIONS = ['Packed', 'Dispatched', 'Delivered']

function friendlyRpcError(message) {
  if (message?.includes('ORDER_ALREADY_DELIVERED')) {
    return 'This order is already Delivered and can no longer be changed.'
  }
  return message
}

function AddressEditForm({ order, onCancel, onSaved }) {
  const { user } = useAuth()
  const existing = parseAddress(order.deliveryAddress) || {}
  const [line1, setLine1] = useState(existing.line1 || '')
  const [line2, setLine2] = useState(existing.line2 || '')
  const [state, setState] = useState(existing.state || '')
  const [city, setCity] = useState(existing.city || '')
  const [mobile, setMobile] = useState(existing.mobile || '')
  const [pincode, setPincode] = useState(existing.pincode || '')
  const [landmark, setLandmark] = useState(existing.landmark || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!line1.trim() || !state || !city || !pincode.trim() || !mobile.trim()) {
      setError('Line 1, state, city, pincode, and contact mobile number are required.')
      return
    }
    if (!isValidIndianMobile(mobile)) {
      setError('Enter a valid 10-digit Indian mobile number (starting 6-9).')
      return
    }
    setSaving(true)
    setError('')
    try {
      const updatedAddress = {
        ...existing,
        line1: line1.trim(),
        line2: line2.trim(),
        state,
        city,
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        mobile: mobile.trim(),
      }
      const { error } = await supabase.rpc('admin_update_order', {
        p_admin_user_id: user.userID,
        p_order_id: order.orderID,
        p_delivery_address: JSON.stringify(updatedAddress),
      })
      if (error) throw new Error(error.message)
      onSaved(updatedAddress)
    } catch (err) {
      setError(friendlyRpcError(err.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-leaf-200 bg-leaf-50 p-3">
      <input className="input-field" placeholder="Line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
      <input className="input-field" placeholder="Line 2" value={line2} onChange={(e) => setLine2(e.target.value)} />
      <StateCitySelect state={state} city={city} onStateChange={setState} onCityChange={setCity} />
      <input
        className="input-field"
        placeholder="Pincode"
        value={pincode}
        onChange={(e) => setPincode(e.target.value)}
      />
      <input
        className="input-field"
        placeholder="Landmark"
        value={landmark}
        onChange={(e) => setLandmark(e.target.value)}
      />
      <input
        className="input-field"
        type="tel"
        placeholder="Contact mobile number"
        value={mobile}
        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
        maxLength={10}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary !px-4 !py-2 text-xs">
          {saving ? 'Saving…' : 'Save address'}
        </button>
        <button onClick={onCancel} className="btn-secondary !px-4 !py-2 text-xs">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function CustomerOrdersDialog({ customer, orders, onClose, onOrderUpdated }) {
  const { user } = useAuth()
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [statusError, setStatusError] = useState({})

  async function handleStatusChange(order, newStatus) {
    setStatusUpdatingId(order.orderID)
    setStatusError((prev) => ({ ...prev, [order.orderID]: '' }))
    try {
      const { error } = await supabase.rpc('admin_update_order', {
        p_admin_user_id: user.userID,
        p_order_id: order.orderID,
        p_order_status: newStatus,
      })
      if (error) throw new Error(error.message)
      onOrderUpdated(order.orderID, { orderStatus: newStatus })
    } catch (err) {
      setStatusError((prev) => ({ ...prev, [order.orderID]: friendlyRpcError(err.message) }))
    } finally {
      setStatusUpdatingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-leaf-900">
              {customer.firstName} {customer.lastName}
            </h2>
            <p className="text-sm text-leaf-600">
              {customer.mobileNo || 'No mobile on file'} · {customer.email || 'No email on file'}
            </p>
          </div>
          <button onClick={onClose} className="text-leaf-500" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.orderID} className="rounded-xl border border-leaf-100 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-leaf-700">
                  {order.orderCode || order.orderID}
                </span>
                <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
                  {order.orderStatus || 'Placed'}
                </span>
              </div>
              <p className="mt-2 text-sm text-leaf-600">
                {order.orderDate ? new Date(order.orderDate).toLocaleString() : ''}
              </p>
              <p className="mt-1 text-sm text-leaf-700">Delivering to: {formatAddress(order.deliveryAddress)}</p>

              <div className="mt-3 overflow-x-auto rounded-lg border border-leaf-100">
                <table className="w-full min-w-[380px] text-left text-xs">
                  <thead className="bg-leaf-50 text-leaf-500">
                    <tr>
                      <th className="px-3 py-1.5">Item</th>
                      <th className="px-3 py-1.5">Qty</th>
                      <th className="px-3 py-1.5">Price</th>
                      <th className="px-3 py-1.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.productBasket || []).map((item, i) => (
                      <tr key={`${order.orderID}-${item.productID || i}`} className="border-t border-leaf-100">
                        <td className="px-3 py-1.5 text-leaf-800">{item.name}</td>
                        <td className="px-3 py-1.5 text-leaf-700">{item.quantity}</td>
                        <td className="px-3 py-1.5 text-leaf-700">₹{Number(item.price).toFixed(0)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-leaf-800">
                          ₹{(Number(item.price) * Number(item.quantity)).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-leaf-600">{order.paymentStatus}</span>
                <span className="font-display font-semibold text-leaf-800">
                  ₹{Number(order.billAmount || 0).toFixed(0)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {order.orderStatus !== 'Delivered' && (
                  <button
                    onClick={() => setEditingAddressId(editingAddressId === order.orderID ? null : order.orderID)}
                    className="text-xs font-semibold text-leaf-700 underline"
                  >
                    {editingAddressId === order.orderID ? 'Close address editor' : 'Edit address'}
                  </button>
                )}

                {order.orderStatus !== 'Delivered' && (
                  <div className="flex items-center gap-2">
                    {statusError[order.orderID] && (
                      <span className="text-xs text-red-600">{statusError[order.orderID]}</span>
                    )}
                    <select
                      className="rounded-full border border-leaf-200 px-3 py-1.5 text-xs font-semibold text-leaf-700"
                      value=""
                      disabled={statusUpdatingId === order.orderID}
                      onChange={(e) => {
                        if (e.target.value) handleStatusChange(order, e.target.value)
                      }}
                    >
                      <option value="" disabled>
                        {statusUpdatingId === order.orderID ? 'Updating…' : 'Change status'}
                      </option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {editingAddressId === order.orderID && (
                <AddressEditForm
                  order={order}
                  onCancel={() => setEditingAddressId(null)}
                  onSaved={(updatedAddress) => {
                    onOrderUpdated(order.orderID, { deliveryAddress: JSON.stringify(updatedAddress) })
                    setEditingAddressId(null)
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
