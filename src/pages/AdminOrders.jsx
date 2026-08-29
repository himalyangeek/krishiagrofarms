import { useEffect, useMemo, useState } from 'react'
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
  const [search, setSearch] = useState('')

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

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) => {
      const addr = parseAddress(order.deliveryAddress)
      const haystack = [
        order.orderCode,
        order.firstName,
        order.lastName,
        order.mobileNo,
        order.email,
        addr?.city,
      ]
      return haystack.some((field) => field && String(field).toLowerCase().includes(q))
    })
  }, [orders, search])

  // Clicking a row still shows this customer's FULL history, even if the
  // search above is currently narrowing the list to one matched order.
  const selectedCustomerOrders = selectedUserID ? orders.filter((o) => o.userID === selectedUserID) : []
  const selectedCustomer = selectedCustomerOrders[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Orders</h1>
      <p className="mt-1 text-leaf-600">Click any order to see the full customer history and manage it.</p>

      <input
        className="input-field mt-4"
        placeholder="Search by order ID, name, mobile, email, or city"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="mt-6 text-leaf-500">Loading orders…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && filteredOrders.length === 0 && (
        <p className="mt-6 text-leaf-500">{orders.length === 0 ? 'No orders yet.' : 'No orders match your search.'}</p>
      )}

      {!loading && !error && filteredOrders.length > 0 && (
        <div className="mt-6 space-y-3 sm:hidden">
          {filteredOrders.map((order) => {
            const addr = parseAddress(order.deliveryAddress)
            return (
              <button
                key={order.orderID}
                onClick={() => setSelectedUserID(order.userID)}
                className="card block w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-leaf-700">
                    {order.orderCode || order.orderID}
                  </span>
                  <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-700">
                    {order.orderStatus || 'Placed'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-leaf-900">
                  {order.firstName} {order.lastName}
                </p>
                <p className="text-sm text-leaf-600">{order.mobileNo || '—'}</p>
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

      {!loading && !error && filteredOrders.length > 0 && (
        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-leaf-100 bg-white shadow-soft sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-leaf-50 text-xs uppercase tracking-wide text-leaf-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
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
              {filteredOrders.map((order) => {
                const addr = parseAddress(order.deliveryAddress)
                return (
                  <tr
                    key={order.orderID}
                    onClick={() => setSelectedUserID(order.userID)}
                    className="cursor-pointer border-t border-leaf-100 hover:bg-leaf-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-leaf-700">
                      {order.orderCode || order.orderID}
                    </td>
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
