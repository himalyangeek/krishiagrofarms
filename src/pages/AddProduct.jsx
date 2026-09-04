import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import ProductFormDialog from '../components/ProductFormDialog'

function EditIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  )
}

export default function AddProduct() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogProduct, setDialogProduct] = useState(null) // product being edited, or null when creating
  const [showDialog, setShowDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
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

  function handleDeleted() {
    setShowDialog(false)
    setNotice('Product deleted.')
    loadProducts()
    setTimeout(() => setNotice(''), 3000)
  }

  // The confirmation popup closes the instant either option is clicked — the
  // actual delete (for "Yes") runs afterward in the background, surfaced via
  // the page notice once it settles.
  async function confirmDelete(product) {
    setDeleteTarget(null)
    try {
      const { error } = await supabase.rpc('admin_delete_product', {
        p_admin_user_id: user.userID,
        p_product_id: product.productID,
      })
      if (error) throw new Error(error.message)
      if (product.imageUrl) {
        supabase.functions
          .invoke('delete-product-image', { body: { adminUserId: user.userID, imageUrl: product.imageUrl } })
          .catch(() => {})
      }
      setNotice('Product deleted.')
      loadProducts()
    } catch (err) {
      setNotice(`Failed to delete: ${err.message}`)
    }
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-leaf-900">Manage Products</h1>
          <p className="mt-1 text-leaf-600">Visible to admins only. Use the icons to edit or delete a product.</p>
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
            <div key={product.productID} className="card flex items-center gap-4 p-4">
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
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(product)}
                  aria-label={`Edit ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-leaf-600 hover:bg-leaf-50 hover:text-leaf-800"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => setDeleteTarget(product)}
                  aria-label={`Delete ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-50 hover:text-red-700"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <ProductFormDialog
          product={dialogProduct}
          onClose={() => setShowDialog(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-leaf-900/50 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-cream p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <p className="text-leaf-900">
              Are you sure you want to delete this product "{deleteTarget.name}"?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary !px-4 !py-2 text-sm">
                No
              </button>
              <button
                onClick={() => confirmDelete(deleteTarget)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
