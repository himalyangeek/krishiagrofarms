import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const { clearCart } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    clearCart()
    navigate('/')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-leaf-100 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 font-display text-xl font-semibold text-leaf-800">
          <img src={`${import.meta.env.BASE_URL}leaf.svg`} alt="" className="h-7 w-7" />
          Harit Kheti
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-semibold text-leaf-700 sm:flex">
          <Link to="/" className="hover:text-leaf-900">
            Shop
          </Link>
          {user ? (
            <>
              {isAdmin && (
                <>
                  <Link to="/admin/add-product" className="hover:text-leaf-900">
                    Add product
                  </Link>
                  <Link to="/admin/orders" className="hover:text-leaf-900">
                    Orders
                  </Link>
                </>
              )}
              <Link to="/profile" className="hover:text-leaf-900">
                {user.firstName || 'Profile'}
              </Link>
              <button onClick={handleLogout} className="btn-secondary !px-4 !py-2 text-xs">
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary !px-4 !py-2 text-xs">
              Log in
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-leaf-800 sm:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-leaf-100 px-4 py-3 text-sm font-semibold text-leaf-700 sm:hidden">
          <Link to="/" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-leaf-50">
            Shop
          </Link>
          {user ? (
            <>
              {isAdmin && (
                <>
                  <Link to="/admin/add-product" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-leaf-50">
                    Add product
                  </Link>
                  <Link to="/admin/orders" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-leaf-50">
                    Orders
                  </Link>
                </>
              )}
              <Link to="/profile" onClick={closeMenu} className="rounded-lg px-3 py-2 hover:bg-leaf-50">
                {user.firstName || 'Profile'}
              </Link>
              <button onClick={handleLogout} className="btn-secondary mt-1 w-full">
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu} className="btn-primary mt-1 w-full">
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
