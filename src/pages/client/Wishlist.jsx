import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatPrice'
import {
  getWishlist,
  removeWishlistProduct,
  addToCart,
  toggleCompareProduct
} from '../../utils/shopActions'

function Wishlist() {
  const [wishlist, setWishlist] = useState([])

  useEffect(() => {
    loadWishlist()

    const handleUpdate = () => {
      loadWishlist()
    }

    window.addEventListener('wishlistUpdated', handleUpdate)

    return () => {
      window.removeEventListener('wishlistUpdated', handleUpdate)
    }
  }, [])

  const loadWishlist = () => {
    setWishlist(getWishlist())
  }

  const handleRemove = (productId) => {
    removeWishlistProduct(productId)
    loadWishlist()
  }

  const handleAddToCart = (product) => {
    addToCart(product)
  }

  const handleCompare = (product) => {
    toggleCompareProduct(product)
  }

  if (wishlist.length === 0) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Sản phẩm yêu thích</h2>

            <p>Bạn chưa có sản phẩm yêu thích nào.</p>

            <Link to="/products" className="back-home-btn">
              Khám phá sản phẩm
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="col-lg-3">
            <h2 className="mb-1">Sản phẩm yêu thích</h2>

            <p className="text-muted mb-0">
              Danh sách sản phẩm bạn đã lưu lại
            </p>
          </div>

          <Link to="/products" className="btn btn-primary">
            Tiếp tục mua hàng
          </Link>
        </div>

        <div className="row">
          {wishlist.map((product) => (
            <div className="col-md-6 col-lg-3 mb-4" key={product.id}>
              <div className="card shadow-sm h-100 wishlist-card">
                <Link to={`/products/${product.id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="card-img-top"
                    style={{
                      height: '220px',
                      objectFit: 'contain',
                      padding: '20px'
                    }}
                  />
                </Link>

                <div className="card-body">
                  <h5 className="card-title">
                    {product.name}
                  </h5>

                  <div className="d-flex gap-1">
                    <p className="text-danger fw-bold mb-1">
                      {formatPrice(product.price)}
                    </p>

                    {product.oldPrice && (
                      <p className="text-muted text-decoration-line-through mb-1">
                        {formatPrice(product.oldPrice)}
                      </p>
                    )}
                  </div>

                  <button
                    className="btn btn-primary btn-sm mt-1"
                    onClick={() => handleAddToCart(product)}
                  >
                    Thêm vào giỏ
                  </button>

                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-outline-primary btn-sm mt-1 col-6"
                      onClick={() => handleCompare(product)}
                    >
                      So sánh
                    </button>

                    <button
                      className="btn btn-outline-danger btn-sm mt-1 col-6"
                      onClick={() => handleRemove(product.id)}
                    >
                      Bỏ yêu thích
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

export default Wishlist