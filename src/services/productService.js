import { Link } from 'react-router-dom'
import { formatPrice } from '../utils/formatPrice'

function ProductCard({ product, onAddCompare }) {
  const handleAddCart = () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || []

    const index = cart.findIndex((item) => item.id === product.id)

    if (index !== -1) {
      cart[index].cartQuantity += 1
    } else {
      cart.push({
        ...product,
        cartQuantity: 1
      })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    alert('Đã thêm vào giỏ hàng')
  }

  return (
    <div className="card h-100 shadow-sm">
      <img
        src={product.image}
        className="card-img-top p-3"
        alt={product.name}
        style={{ height: '220px', objectFit: 'contain' }}
      />

      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.name}</h5>

        <p className="text-muted mb-1">Hãng: {product.brand}</p>
        <p className="mb-1">RAM: {product.ram}</p>
        <p className="mb-1">Bộ nhớ: {product.storage}</p>

        <p className="fw-bold text-danger fs-5 mt-2">
          {formatPrice(product.price)}
        </p>

        {product.oldPrice > 0 && (
          <p className="text-muted text-decoration-line-through">
            {formatPrice(product.oldPrice)}
          </p>
        )}

        <div className="mt-auto">
          <Link
            to={`/products/${product.id}`}
            className="btn btn-primary w-100 mb-2"
          >
            Xem chi tiết
          </Link>

          <button
            className="btn btn-success w-100 mb-2"
            onClick={handleAddCart}
          >
            Thêm vào giỏ hàng
          </button>

          <button
            className="btn btn-outline-secondary w-100"
            onClick={() => onAddCompare(product)}
          >
            So sánh
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard