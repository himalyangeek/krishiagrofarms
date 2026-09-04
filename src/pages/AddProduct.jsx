import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const MAX_IMAGE_BYTES = 25 * 1024 // 25KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

const initialForm = {
  name: '',
  price: '',
  currentStock: '',
  unit: '',
  description: '',
  composition: '',
  ingredients: '',
  process: '',
}

export default function AddProduct() {
  const { user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a rejection
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

  function removeImage() {
    setImageFile(null)
    setImagePreview('')
    setImageError('')
  }

  async function uploadImage() {
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
    console.log("data.url", data)
    console.log("data.url", data.url)
    return data.url
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

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
      let imageUrl = null
      if (imageFile) {
        imageUrl = await uploadImage()
      }
      console.log(imageUrl)
      const { error } = await supabase.rpc('add_product', {
        p_admin_user_id: user.userID,
        p_name: form.name.trim(),
        p_price: Number(form.price),
        p_current_stock: Number(form.currentStock),
        p_image_url: imageUrl,
        p_description: form.description.trim() || null,
        p_composition: form.composition.trim() || null,
        p_ingredients: form.ingredients.trim() || null,
        p_process: form.process.trim() || null,
        p_unit: form.unit.trim() || null,
      })
      if (error) throw new Error(error.message)
      setSuccess(`"${form.name}" was added to the catalog.`)
      setForm(initialForm)
      removeImage()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-leaf-900">Add a product</h1>
      <p className="mt-1 text-leaf-600">Visible to admins only.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <button type="button" onClick={removeImage} className="text-sm font-semibold text-leaf-700 underline">
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
        {success && <p className="text-sm text-leaf-700">{success}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Adding…' : 'Add product'}
        </button>
      </form>
    </div>
  )
}
