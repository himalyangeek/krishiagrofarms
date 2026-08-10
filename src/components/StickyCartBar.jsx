import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function StickyCartBar() {
  const { totalItems, totalAmount } = useCart()
  const navigate = useNavigate()

  if (totalItems === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-leaf-100 bg-white/95 p-3 backdrop-blur">
      <button
        onClick={() => navigate('/checkout')}
        className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl bg-leaf-700 px-5 py-4 text-white shadow-soft transition hover:bg-leaf-800"
      >
        <span className="font-semibold">
          {totalItems} item{totalItems > 1 ? 's' : ''} in basket
        </span>
        <span className="flex items-center gap-2 font-display text-lg font-semibold">
          ₹{totalAmount.toFixed(0)}
          <span aria-hidden>→</span>
        </span>
      </button>
    </div>
  )
}
