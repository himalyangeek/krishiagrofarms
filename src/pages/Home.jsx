import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ProductGrid from '../components/ProductGrid'
import ProductDetailDialog from '../components/ProductDetailDialog'
import KrishiAgroImage from '../assets/images/krishiagro.jpg'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeProduct, setActiveProduct] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .order('updatedDate', { ascending: true })
      if (error) {
        setError(error.message)
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <section className="relative overflow-hidden bg-leaf-800 text-cream">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 sm:items-center sm:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-leaf-700/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-leaf-100">
              100% Organic · Farm to Home
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Real food, grown the way nature intended.
            </h1>
            <p className="mt-4 max-w-md text-leaf-100/90">
              We work directly with small organic farms to bring you chemical-free grains,
              oils, and staples — harvested, processed, and packed with care.
            </p>
            <a href="#products" className="btn-primary mt-6 inline-block bg-earth-500 hover:bg-earth-600">
              Shop organic products
            </a>
          </div>
          <div className="relative hidden sm:block">
            <div className="aspect-square overflow-hidden rounded-[2rem] border-4 border-leaf-600/40 shadow-soft">
              <img
                src={KrishiAgroImage}
                alt="Organic farm field"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { title: 'No chemicals', desc: 'Grown without synthetic pesticides or fertilizers.' },
            { title: 'Small farms', desc: 'Sourced directly from village-level organic farmers.' },
            { title: 'Traditional process', desc: 'Cold-pressed, sun-dried, stone-ground — the old way.' },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <h3 className="font-display text-lg font-semibold text-leaf-800">{f.title}</h3>
              <p className="mt-1 text-sm text-leaf-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-6 font-display text-2xl font-semibold text-leaf-900">Our products</h2>
        {loading && <p className="text-leaf-500">Loading products…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && <ProductGrid products={products} onOpenProduct={setActiveProduct} />}
      </section>

      <ProductDetailDialog product={activeProduct} onClose={() => setActiveProduct(null)} />
    </div>
  )
}
