import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import StickyCartBar from './components/StickyCartBar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import { useCart } from './context/CartContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import AddProduct from './pages/AddProduct'
import AdminOrders from './pages/AdminOrders'

export default function App() {
  const location = useLocation()
  const { clearCart } = useCart()
  const showCartBar = location.pathname !== '/checkout'

  // Runs once per actual page load (not on SPA-internal navigation, since
  // App never remounts for that) — resets a stale basket whenever someone
  // freshly lands on the home route, e.g. after the Google OAuth redirect
  // or opening the site straight from a browser refresh/new tab.
  const didCheckFreshLoad = useRef(false)
  useEffect(() => {
    if (didCheckFreshLoad.current) return
    didCheckFreshLoad.current = true
    if (location.pathname === '/') {
      clearCart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/add-product"
            element={
              <AdminRoute>
                <AddProduct />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrders />
              </AdminRoute>
            }
          />
        </Routes>
      </main>
      {showCartBar && <StickyCartBar />}
    </div>
  )
}
