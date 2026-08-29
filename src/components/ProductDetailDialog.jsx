import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function ProductDetailDialog({ product, onClose }) {
  const { addItem, totalItems, totalAmount } = useCart()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)

  if (!product) return null

  const maxQty = product.currentStock ?? 99

  function handleAdd() {
    addItem(product, quantity)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img src={product.imageUrl} alt={product.name} className="h-56 w-full object-cover sm:h-64" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-leaf-800 shadow"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-leaf-900">{product.name}</h2>
            <p className="mt-1 text-leaf-600">{product.description}</p>
          </div>

          <div className="flex items-baseline justify-between border-y border-leaf-100 py-3">
            <span className="font-display text-2xl font-semibold text-leaf-800">
              ₹{Number(product.price).toFixed(0)}
              <span className="ml-1 text-sm font-normal text-leaf-500">/ {product.unit}</span>
            </span>
            <span className="text-sm text-leaf-600">
              {product.currentStock > 0
                ? `${product.currentStock} packets available`
                : 'Out of stock'}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-leaf-500">Composition</dt>
              <dd className="text-sm text-leaf-800">{product.composition || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-leaf-500">Ingredients</dt>
              <dd className="text-sm text-leaf-800">{product.ingredients || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-leaf-500">
                How it's made
              </dt>
              <dd className="text-sm text-leaf-800">{product.process || '—'}</dd>
            </div>
          </dl>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center rounded-full border border-leaf-200">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-10 w-10 text-lg font-semibold text-leaf-700"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="h-10 w-10 text-lg font-semibold text-leaf-700"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={maxQty === 0}
              className="btn-primary flex-1"
            >
              Add to basket
            </button>
          </div>

          {totalItems > 0 && (
            <button
              onClick={() => {
                onClose()
                navigate('/checkout')
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-leaf-700 px-5 py-3 text-white transition hover:bg-leaf-800"
            >
              <span className="font-semibold">
                Go to basket ({totalItems} item{totalItems > 1 ? 's' : ''})
              </span>
              <span className="flex items-center gap-2 font-display font-semibold">
                ₹{totalAmount.toFixed(0)}
                <span aria-hidden>→</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
