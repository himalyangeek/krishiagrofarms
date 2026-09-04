import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductFormDialog from '../components/ProductFormDialog'

export default function AddProduct() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogProduct, setDialogProduct] = useState(null) // product being edited, or null when creating
  const [showDialog, setShowDialog] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('Product').select('*').order('updatedDate', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setProducts(data || [])
      setError('')
    }
    setLoading(false)
  }

  function openCreate() {
    setDialogProduct(null)
    setShowDialog(true)
  }

  function openEdit(product) {
    setDialogProduct(product)
    setShowDialog(true)
  }

  function handleSaved() {
    setShowDialog(false)
    setNotice(dialogProduct ? 'Product updated.' : 'Product added.')
    loadProducts()
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-leaf-900">Manage Products</h1>
          <p className="mt-1 text-leaf-600">Visible to admins only. Click any product to edit it.</p>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0 !px-4 !py-2 text-sm">
          + Add product
        </button>
      </div>

      {notice && <p className="mt-4 text-sm text-leaf-700">{notice}</p>}
      {loading && <p className="mt-6 text-leaf-500">Loading products…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-6 space-y-3">
          {products.length === 0 && <p className="text-leaf-500">No products yet.</p>}
          {products.map((product) => (
            <button
              key={product.productID}
              onClick={() => openEdit(product)}
              className="card flex w-full items-center gap-4 p-4 text-left"
            >
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-leaf-100" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-leaf-900">{product.name}</p>
                <p className="text-sm text-leaf-500">{product.unit}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold text-leaf-800">₹{Number(product.price).toFixed(0)}</p>
                <p className="text-sm text-leaf-500">{product.currentStock} in stock</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDialog && (
        <ProductFormDialog
          product={dialogProduct}
          onClose={() => setShowDialog(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
