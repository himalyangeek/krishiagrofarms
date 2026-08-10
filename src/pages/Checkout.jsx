import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import AddressModal from '../components/AddressModal'

export default function Checkout() {
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [address, setAddress] = useState(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('ONLINE')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrderId, setPlacedOrderId] = useState(null)
  const [placedPaymentMethod, setPlacedPaymentMethod] = useState('ONLINE')

  if (placedOrderId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-3xl">
          ✓
        </div>
        <h1 className="font-display text-2xl font-semibold text-leaf-900">Order placed!</h1>
        <p className="mt-2 text-leaf-600">
          Order <span className="font-mono text-sm">{placedOrderId}</span> has been confirmed.
        </p>
        {placedPaymentMethod === 'COD' && (
          <p className="mt-1 text-sm text-leaf-600">Please keep the amount ready for cash on delivery.</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary">
            Continue shopping
          </button>
          <button onClick={() => navigate('/profile')} className="btn-primary">
            View my orders
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-leaf-600">Your basket is empty.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Browse products
        </button>
      </div>
    )
  }

  async function handlePay() {
    if (!address) {
      setError('Please select a delivery address before paying.')
      return
    }
    setError('')
    setPlacing(true)
    try {
      const basket = items.map((i) => ({
        productID: i.productID,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      }))
      const addressString = JSON.stringify(address)

      const { data, error } = await supabase.rpc('place_order', {
        p_user_id: user.userID,
        p_product_basket: basket,
        p_bill_amount: totalAmount,
        p_delivery_address: addressString,
        p_payment_method: paymentMethod,
      })
      if (error) throw new Error(error.message)

      setPlacedOrderId(data)
      setPlacedPaymentMethod(paymentMethod)
      clearCart()
      // Fire-and-forget: a missing/failed confirmation email should never block checkout.
      supabase.functions.invoke('send-order-confirmation', { body: { orderId: data } }).catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Order details</h1>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.productID} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-4">
              <img src={item.imageUrl} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-leaf-900">{item.name}</p>
                <p className="text-sm text-leaf-500">
                  ₹{item.price} / {item.unit}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center rounded-full border border-leaf-200">
                <button
                  onClick={() => updateQuantity(item.productID, item.quantity - 1)}
                  className="h-8 w-8 text-leaf-700"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productID, item.quantity + 1)}
                  className="h-8 w-8 text-leaf-700"
                >
                  +
                </button>
              </div>
              <p className="w-16 text-right font-semibold text-leaf-800">
                ₹{(item.price * item.quantity).toFixed(0)}
              </p>
              <button
                onClick={() => removeItem(item.productID)}
                className="text-leaf-400 hover:text-red-500"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-leaf-900">Delivery address</h2>
          <button onClick={() => setShowAddressModal(true)} className="text-sm font-semibold text-leaf-700 underline">
            {address ? 'Change' : 'Select address'}
          </button>
        </div>
        {address ? (
          <p className="mt-2 text-sm text-leaf-700">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.pincode}
            {address.landmark ? ` (near ${address.landmark})` : ''}
            {address.mobile ? ` · contact ${address.mobile}` : ''}
            {address.coords ? ' · location captured' : ''}
          </p>
        ) : (
          <p className="mt-2 text-sm text-leaf-500">No address selected yet — required before payment.</p>
        )}
      </div>

      <div className="card mt-6 p-4">
        <h2 className="font-semibold text-leaf-900">Payment method</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label
            className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
              paymentMethod === 'ONLINE' ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === 'ONLINE'}
              onChange={() => setPaymentMethod('ONLINE')}
            />
            Pay now
          </label>
          <label
            className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${
              paymentMethod === 'COD' ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-200'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={paymentMethod === 'COD'}
              onChange={() => setPaymentMethod('COD')}
            />
            Cash on delivery
          </label>
        </div>
      </div>

      <div className="card mt-6 flex items-center justify-between p-4">
        <span className="font-semibold text-leaf-900">Total amount</span>
        <span className="font-display text-2xl font-semibold text-leaf-800">₹{totalAmount.toFixed(0)}</span>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button onClick={handlePay} disabled={placing} className="btn-primary mt-6 w-full">
        {placing
          ? 'Placing order…'
          : paymentMethod === 'COD'
            ? `Place order (Cash on delivery) — ₹${totalAmount.toFixed(0)}`
            : `Pay ₹${totalAmount.toFixed(0)}`}
      </button>

      {showAddressModal && (
        <AddressModal
          initialAddress={address}
          onClose={() => setShowAddressModal(false)}
          onSave={(addr) => {
            setAddress(addr)
            setShowAddressModal(false)
            setError('')
          }}
        />
      )}
    </div>
  )
}
