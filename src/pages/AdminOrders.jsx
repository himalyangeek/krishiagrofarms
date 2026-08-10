import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { parseAddress } from '../lib/address'
import CustomerOrdersDialog from '../components/CustomerOrdersDialog'

export default function AdminOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserID, setSelectedUserID] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_get_all_orders', { p_admin_user_id: user.userID })
    if (error) {
      setError(error.message)
    } else {
      setOrders(data || [])
      setError('')
    }
    setLoading(false)
  }

  function handleOrderUpdated(orderID, patch) {
    setOrders((prev) => prev.map((o) => (o.orderID === orderID ? { ...o, ...patch } : o)))
  }

  const selectedCustomerOrders = selectedUserID ? orders.filter((o) => o.userID === selectedUserID) : []
  const selectedCustomer = selectedCustomerOrders[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Orders</h1>
      <p className="mt-1 text-leaf-600">Click any order to see the full customer history and manage it.</p>

      {loading && <p className="mt-6 text-leaf-500">Loading orders…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p className="mt-6 text-leaf-500">No orders yet.</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="mt-6 space-y-3 sm:hidden">
          {orders.map((order) => {
            const addr = parseAddress(order.deliveryAddress)
            return (
              <button
                key={order.orderID}
                onClick={() => setSelectedUserID(order.userID)}
                className="card block w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-leaf-900">
                    {order.firstName} {order.lastName}
                  </span>
                  <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
                    {order.orderStatus || 'Placed'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-leaf-600">{order.mobileNo || '—'}</p>
                <p className="text-sm text-leaf-600">{order.email || '—'}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-leaf-600">
                    {addr?.city || '—'} · {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
                  </span>
                  <span className="font-display font-semibold text-leaf-800">
                    ₹{Number(order.billAmount || 0).toFixed(0)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-leaf-100 bg-white shadow-soft sm:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-leaf-50 text-xs uppercase tracking-wide text-leaf-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const addr = parseAddress(order.deliveryAddress)
                return (
                  <tr
                    key={order.orderID}
                    onClick={() => setSelectedUserID(order.userID)}
                    className="cursor-pointer border-t border-leaf-100 hover:bg-leaf-50"
                  >
                    <td className="px-4 py-3 font-medium text-leaf-900">
                      {order.firstName} {order.lastName}
                    </td>
                    <td className="px-4 py-3 text-leaf-700">{order.mobileNo || '—'}</td>
                    <td className="px-4 py-3 text-leaf-700">{order.email || '—'}</td>
                    <td className="px-4 py-3 text-leaf-700">{addr?.city || '—'}</td>
                    <td className="px-4 py-3 text-leaf-600">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
                        {order.orderStatus || 'Placed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-leaf-800">
                      ₹{Number(order.billAmount || 0).toFixed(0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && (
        <CustomerOrdersDialog
          customer={selectedCustomer}
          orders={selectedCustomerOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))}
          onClose={() => setSelectedUserID(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </div>
  )
}
