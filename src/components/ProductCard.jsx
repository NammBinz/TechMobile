import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatPrice } from '../utils/formatPrice'
import RatingStars from './RatingStars'
import { addToCart, getCompareList, toggleCompareProduct } from '../utils/shopActions'
import { isInWishlist, toggleWishlistProduct } from '../utils/shopActions'

function ProductCard({ product }) {
  const navigate = useNavigate()
  const [compareList, setCompareList] = useState([])

  const loadCompareList = () => {
    setCompareList(getCompareList())
  }

  // Tự cập nhật danh sách so sánh
  useEffect(() => {
    loadCompareList()

    window.addEventListener('compareUpdated', loadCompareList)

    return () => { window.removeEventListener('compareUpdated', loadCompareList) }
  }, [])

  const [liked, setLiked] = useState(false)

  useEffect(() => {
    setLiked(isInWishlist(product.id))
  }, [product.id])

  const handleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()

    toggleWishlistProduct(product)
    setLiked(isInWishlist(product.id))
  }

  const discount = (product.oldPrice || product.msrp || 0) - product.price
  const isComparing = compareList.some((item) => item.id === product.id)
  const isOutOfStock = Number(product.quantity) <= 0 || product.status !== 'active'

  const handleAddCart = (e) => {
    e.stopPropagation()
    addToCart(product)
  }

  const handleCompare = (e) => {
    e.stopPropagation()
    toggleCompareProduct(product)
  }

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
          loading="lazy"  // ảnh chỉ tải khi gần xuất hiện trên màn hình
        />

        <button
          className={isComparing ? 'compare-btn active' : 'compare-btn'}
          onClick={handleCompare}
          title="So sánh sản phẩm"
        >
          {isComparing ? '✓' : '+'}
        </button>

        {discount > 0 && (
          <div className="discount-badge">
            -{Math.round(discount / 1000000)}tr
          </div>
        )}

        {isOutOfStock && (
          <div className="out-stock-badge">
            Hết hàng
          </div>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>

        <div className="product-price-section">
          <div className="price-row">
            <span className="product-price">
              {formatPrice(product.price)}
            </span>

            {(product.oldPrice || product.msrp) > product.price && (
              <span className="product-msrp">
                {formatPrice(product.oldPrice || product.msrp)}
              </span>
            )}
          </div>

          {discount > 0 && (
            <div className="installment-badge">
              Khuyến mãi trả góp 0%
            </div>
          )}
        </div>

        <div className="product-rating">
          <div className="product-rating-left">
            <RatingStars rating={product.rating} size="sm" />

            <span className="review-count">
              ({product.reviews})
            </span>
          </div>

          <button
            className={liked ? 'wishlist-rating-btn active' : 'wishlist-rating-btn'}
            onClick={handleWishlist}
            title="Yêu thích"
          >
            ♥
          </button>
        </div>

        <div className="buy-btn-container">
          <button
            className="buy-btn"
            onClick={handleAddCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard