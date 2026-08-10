import ProductCard from './ProductCard'

export default function ProductGrid({ products, onOpenProduct }) {
  if (!products.length) {
    return <p className="py-12 text-center text-leaf-500">No products available right now.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.productID} product={product} onOpen={onOpenProduct} />
      ))}
    </div>
  )
}
