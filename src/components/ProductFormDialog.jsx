import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const MAX_IMAGE_BYTES = 25 * 1024 // 25KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

function blankForm(product) {
  return {
    name: product?.name || '',
    price: product?.price ?? '',
    currentStock: product?.currentStock ?? '',
    unit: product?.unit || '',
    description: product?.description || '',
    composition: product?.composition || '',
    ingredients: product?.ingredients || '',
    process: product?.process || '',
  }
}

export default function ProductFormDialog({ product, onClose, onSaved, onDeleted }) {
  const { user } = useAuth()
  const isEdit = Boolean(product)

  const [form, setForm] = useState(blankForm(product))
  const [existingImageUrl, setExistingImageUrl] = useState(product?.imageUrl || null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImageError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError('Choose a PNG, JPEG, WebP, GIF, or SVG image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(`Image is ${(file.size / 1024).toFixed(1)}KB — must be smaller than 25KB.`)
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  function clearNewImage() {
    setImageFile(null)
    setImagePreview('')
    setImageError('')
  }

  function removeExistingImage() {
    setExistingImageUrl(null)
    clearNewImage()
  }

  async function uploadNewImage() {
    const base64 = imagePreview.split(',')[1]
    const { data, error } = await supabase.functions.invoke('upload-product-image', {
      body: {
        adminUserId: user.userID,
        fileName: imageFile.name,
        contentType: imageFile.type,
        fileBase64: base64,
      },
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(data.error)
    return data.url
  }

  // Best-effort cleanup — a storage hiccup here should never block the
  // product save the admin is actually trying to do.
  async function deleteOldImage(url) {
    try {
      await supabase.functions.invoke('delete-product-image', {
        body: { adminUserId: user.userID, imageUrl: url },
      })
    } catch (err) {
      console.warn('Failed to delete old product image:', err)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const { error } = await supabase.rpc('admin_delete_product', {
        p_admin_user_id: user.userID,
        p_product_id: product.productID,
      })
      if (error) throw new Error(error.message)
      if (product.imageUrl) await deleteOldImage(product.imageUrl)
      onDeleted()
    } catch (err) {
      setError(err.message)
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.price || !form.currentStock) {
      setError('Name, price, and current stock are required.')
      return
    }
    if (imageError) {
      setError(imageError)
      return
    }

    setSubmitting(true)
    try {
      const originalImageUrl = product?.imageUrl || null
      let finalImageUrl = existingImageUrl

      if (imageFile) {
        // Old image goes first, so storage never accumulates stale files.
        if (originalImageUrl) await deleteOldImage(originalImageUrl)
        finalImageUrl = await uploadNewImage()
      } else if (originalImageUrl && !existingImageUrl) {
        // Image was explicitly removed, no replacement picked.
        await deleteOldImage(originalImageUrl)
        finalImageUrl = null
      }

      const payload = {
        p_name: form.name.trim(),
        p_price: Number(form.price),
        p_current_stock: Number(form.currentStock),
        p_image_url: finalImageUrl,
        p_description: form.description.trim() || null,
        p_composition: form.composition.trim() || null,
        p_ingredients: form.ingredients.trim() || null,
        p_process: form.process.trim() || null,
        p_unit: form.unit.trim() || null,
      }

      const { error } = isEdit
        ? await supabase.rpc('admin_update_product', {
            p_admin_user_id: user.userID,
            p_product_id: product.productID,
            ...payload,
          })
        : await supabase.rpc('add_product', {
            p_admin_user_id: user.userID,
            ...payload,
          })

      if (error) throw new Error(error.message)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-leaf-900">
            {isEdit ? 'Edit product' : 'Add a product'}
          </h2>
          <button onClick={onClose} className="text-leaf-500" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input-field"
            placeholder="Product name *"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input-field"
              type="number"
              step="0.01"
              placeholder="Price (₹) *"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
            />
            <input
              className="input-field"
              type="number"
              placeholder="Current stock *"
              value={form.currentStock}
              onChange={(e) => update('currentStock', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Unit (e.g. 1 kg pack)"
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-leaf-700">
              Product image <span className="font-normal text-leaf-500">(optional, under 25KB)</span>
            </label>
            {imagePreview ? (
              <div className="flex items-center gap-3">
                <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover" />
                <div className="text-sm text-leaf-600">
                  {imageFile.name} · {(imageFile.size / 1024).toFixed(1)}KB
                </div>
                <button type="button" onClick={clearNewImage} className="text-sm font-semibold text-leaf-700 underline">
                  Cancel
                </button>
              </div>
            ) : existingImageUrl ? (
              <div className="flex items-center gap-3">
                <img src={existingImageUrl} alt="Current" className="h-16 w-16 rounded-xl object-cover" />
                <label className="text-sm font-semibold text-leaf-700 underline">
                  Change
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleImageChange}
                  />
                </label>
                <button type="button" onClick={removeExistingImage} className="text-sm font-semibold text-leaf-700 underline">
                  Remove
                </button>
              </div>
            ) : (
              <input
                className="input-field"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={handleImageChange}
              />
            )}
            {imageError && <p className="mt-1 text-sm text-red-600">{imageError}</p>}
          </div>

          <textarea
            className="input-field"
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
          <textarea
            className="input-field"
            placeholder="Composition"
            rows={2}
            value={form.composition}
            onChange={(e) => update('composition', e.target.value)}
          />
          <textarea
            className="input-field"
            placeholder="Ingredients"
            rows={2}
            value={form.ingredients}
            onChange={(e) => update('ingredients', e.target.value)}
          />
          <textarea
            className="input-field"
            placeholder="Manufacturing process"
            rows={2}
            value={form.process}
            onChange={(e) => update('process', e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
          </button>
        </form>

        {isEdit && (
          <div className="mt-4 border-t border-leaf-100 pt-4">
            {confirmingDelete ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3">
                <span className="text-sm text-red-700">Delete "{product.name}" permanently?</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="btn-secondary !px-4 !py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-sm font-semibold text-red-600 underline"
              >
                Delete this product
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
