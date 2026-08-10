import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'agro-store:cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(product, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productID === product.productID)
      if (existing) {
        return prev.map((i) =>
          i.productID === product.productID ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [
        ...prev,
        {
          productID: product.productID,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          unit: product.unit,
          quantity,
        },
      ]
    })
  }

  function removeItem(productID) {
    setItems((prev) => prev.filter((i) => i.productID !== productID))
  }

  function updateQuantity(productID, quantity) {
    if (quantity <= 0) {
      removeItem(productID)
      return
    }
    setItems((prev) => prev.map((i) => (i.productID === productID ? { ...i, quantity } : i)))
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    [items]
  )

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
