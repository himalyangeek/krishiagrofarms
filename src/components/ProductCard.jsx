export default function ProductCard({ product, onOpen }) {
  return (
    <button
      onClick={() => onOpen(product)}
      className="card group flex flex-col overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-leaf-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-lg font-semibold text-leaf-900">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-leaf-600">{product.description}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-xl font-semibold text-leaf-800">
            ₹{Number(product.price).toFixed(0)}
          </span>
          <span className="text-xs text-leaf-500">{product.unit}</span>
        </div>
      </div>
    </button>
  )
}
