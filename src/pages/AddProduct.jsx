import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const initialForm = {
  name: '',
  price: '',
  currentStock: '',
  imageUrl: '',
  unit: '',
  description: '',
  composition: '',
  ingredients: '',
  process: '',
}

export default function AddProduct() {
  const { user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim() || !form.price || !form.currentStock) {
      setError('Name, price, and current stock are required.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('add_product', {
        p_admin_user_id: user.userID,
        p_name: form.name.trim(),
        p_price: Number(form.price),
        p_current_stock: Number(form.currentStock),
        p_image_url: form.imageUrl.trim() || null,
        p_description: form.description.trim() || null,
        p_composition: form.composition.trim() || null,
        p_ingredients: form.ingredients.trim() || null,
        p_process: form.process.trim() || null,
        p_unit: form.unit.trim() || null,
      })
      if (error) throw new Error(error.message)
      setSuccess(`"${form.name}" was added to the catalog.`)
      setForm(initialForm)
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
        <input
          className="input-field"
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => update('imageUrl', e.target.value)}
        />
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
