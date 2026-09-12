import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'
import { addToCart, getCompareList, toggleCompareProduct } from '../../utils/shopActions'
import ProductReviews from '../../components/ProductReviews'
import RatingStars from '../../components/RatingStars'
import '../../assets/css/product-detail.css'
import { isInWishlist, toggleWishlistProduct } from '../../utils/shopActions'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [products, setProducts] = useState([])
  const [compareList, setCompareList] = useState([])

  const [selectedColor, setSelectedColor] = useState('')
  const [selectedStorage, setSelectedStorage] = useState('')
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (product) {
      setLiked(isInWishlist(product.id))
    }
  }, [product])

  useEffect(() => {
    window.scrollTo(0, 0)

    getData()
    loadCompareList()

    window.addEventListener('compareUpdated', loadCompareList)

    return () => {
      window.removeEventListener('compareUpdated', loadCompareList)
    }
  }, [id])

  const getData = async () => {
    try {
      const productRes = await api.get(`/products/${id}`)
      const productsRes = await api.get('/products')

      setProduct(productRes.data)
      setProducts(productsRes.data)

      // Lấy danh sách biến thể
      const variants = productRes.data.variants || []

      // Chọn biến thể đầu làm mặc định
      if (variants.length > 0) {
        setSelectedColor(variants[0].color)
        setSelectedStorage(variants[0].storage)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const loadCompareList = () => {
    setCompareList(getCompareList())
  }

  const getSpecs = (item) => {
    return {
      screen: item.screen || 'Đang cập nhật',
      chip: item.chip || 'Đang cập nhật',
      ram: item.ram || 'Đang cập nhật',
      rom: item.rom || item.storage || 'Đang cập nhật',
      camera: item.camera || 'Đang cập nhật',
      battery: item.battery || 'Đang cập nhật',
      charge: item.charge || 'Đang cập nhật',

      memory: item.memory || {
        ram: item.ram || 'Đang cập nhật',
        storage: item.storage || 'Đang cập nhật',
        card: 'Đang cập nhật'
      },

      displayCamera: item.displayCamera || {
        display: item.screen || 'Đang cập nhật',
        rearCamera: item.camera || 'Đang cập nhật',
        frontCamera: 'Đang cập nhật'
      },

      batteryCharge: item.batteryCharge || {
        battery: item.battery || 'Đang cập nhật',
        charge: item.charge || 'Đang cập nhật',
        wireless: 'Đang cập nhật'
      },

      utilities: item.utilities || {
        security: 'Đang cập nhật',
        waterResistant: 'Đang cập nhật',
        special: 'Đang cập nhật'
      },

      connection: item.connection || {
        sim: 'Đang cập nhật',
        network: '5G',
        port: 'USB-C'
      },

      design: item.design || {
        material: 'Đang cập nhật',
        weight: 'Đang cập nhật',
        color: 'Đang cập nhật'
      }
    }
  }

  const handleWishlist = () => {
    if (!product) return

    toggleWishlistProduct(displayProduct || product)
    setLiked(isInWishlist(product.id))
  }

  const isComparing = (productId) => {
    return compareList.some((item) => item.id === productId)
  }

  // Lấy sản phẩm liên quan
  const getRelatedProducts = () => {
    if (!product) return []

    let relatedProducts = products.filter((item) => {
      return item.id !== product.id && item.brand === product.brand
    })

    if (relatedProducts.length < 4) {
      const moreProducts = [...products]
        .filter((item) => item.id !== product.id && item.brand !== product.brand)
        .sort((a, b) => Number(b.reviews || 0) - Number(a.reviews || 0))

      relatedProducts = [...relatedProducts, ...moreProducts]
    }

    return relatedProducts.slice(0, 4)
  }

  const handleCompare = (item) => {
    toggleCompareProduct(item)
    loadCompareList()
  }

  if (!product) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Đang tải sản phẩm...</h2>
          </div>
        </div>
      </main>
    )
  }

  const specs = getSpecs(product)               // Lấy thông số sản phẩm
  const relatedProducts = getRelatedProducts()  // Lấy sản phẩm liên quan

  const variants = product.variants || []       // Lấy biến thể
  const colors = [...new Set(variants.map((item) => item.color))]      // Lấy màu sắc ko trùng lặp
  const storages = [...new Set(variants.map((item) => item.storage))]  // Lấy dung lượng ko trùng lặp

  const selectedVariant = variants.find((item) => {
    return item.color === selectedColor && item.storage === selectedStorage
  })

  const displayProduct = selectedVariant
    ? {
      ...product,
      price: selectedVariant.price,
      oldPrice: selectedVariant.oldPrice,
      image: selectedVariant.image || product.image,
      storage: selectedVariant.storage,
      color: selectedVariant.color,
      variantId: selectedVariant.id,
      cartKey: `${product.id}-${selectedVariant.id}`,
      productId: product.id,
      name: `${product.name} ${selectedVariant.storage}`
    }
    : product

  const displayOldPrice = displayProduct.oldPrice || product.oldPrice || 0

  const displayDiscount = displayOldPrice - displayProduct.price

  const displayDiscountPercent =
    displayOldPrice > displayProduct.price
      ? Math.round((displayDiscount / displayOldPrice) * 100) : 0

  const isOutOfStock =
    Number(displayProduct.quantity) <= 0 || displayProduct.status !== 'active'

  return (
    <main className="main">
      <div className="container">
        <div className="product-detail-page">
          <div className="breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span>/</span>

            <Link to="/products">Sản phẩm</Link>
            <span>/</span>

            <strong>{product.name}</strong>
          </div>

          <section className="product-detail-main">
            <div className="detail-image-box">
              <img src={displayProduct.image} alt={displayProduct.name} />
            </div>

            <div className="detail-info-box">
              <p className="detail-brand">{displayProduct.brand}</p>

              <h1>{displayProduct.name}</h1>

              <div className="detail-rating">
                <RatingStars
                  rating={product.rating || 5}
                  size="md"
                  showNumber={true}
                />
                <span>({product.reviews || 0} đánh giá)</span>
              </div>

              <div className="detail-price-box">
                <strong className="detail-price">
                  {formatPrice(displayProduct.price)}
                </strong>

                {displayOldPrice > displayProduct.price && (
                  <>
                    <span className="detail-msrp">
                      {formatPrice(displayOldPrice)}
                    </span>

                    <span className="detail-discount">
                      Giảm {displayDiscountPercent}%
                    </span>
                  </>
                )}
              </div>

              {colors.length > 0 && (
                <div className="detail-options">
                  <h3>Màu sắc</h3>

                  <div className="option-list">
                    {colors.map((color) => (
                      <button
                        className={
                          selectedColor === color ? 'option-btn active' : 'option-btn'
                        }
                        key={color}
                        onClick={() => {
                          setSelectedColor(color)

                          const sameStorageVariant = variants.find((item) => {
                            return (
                              item.color === color && item.storage === selectedStorage
                            )
                          })

                          if (!sameStorageVariant) {
                            const firstVariantByColor = variants.find((item) => {
                              return item.color === color
                            })

                            if (firstVariantByColor)
                              setSelectedStorage(firstVariantByColor.storage)
                          }
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-options">
                <h3>Dung lượng</h3>

                <div className="option-list">
                  {storages.length > 0 ? (
                    storages.map((storage) => (
                      <button
                        className={
                          selectedStorage === storage ? 'option-btn active' : 'option-btn'
                        }
                        key={storage}
                        onClick={() => setSelectedStorage(storage)}
                      >
                        {storage}
                      </button>
                    ))
                  ) : (
                    <button className="option-btn active">
                      {specs.rom}
                    </button>
                  )}
                </div>
              </div>

              <div className="promotion-box">
                <h3>Khuyến mãi</h3>

                <ul>
                  <li>Trả góp 0% qua thẻ tín dụng.</li>
                  <li>Giảm thêm khi thanh toán online.</li>
                  <li>Bảo hành chính hãng 12 tháng.</li>
                </ul>
              </div>

              <div className="detail-action-row">
                <button
                  className="detail-buy-btn"
                  onClick={() => addToCart(displayProduct)}
                  disabled={isOutOfStock}
                >
                  {isOutOfStock ? 'Hết hàng' : 'Mua ngay'}
                </button>

                <button
                  className={liked ? 'btn btn-danger' : 'btn btn-outline-danger'}
                  onClick={handleWishlist}
                >
                  {liked ? 'Đã yêu thích' : 'Yêu thích'}
                </button>

                <button
                  className={
                    isComparing(displayProduct.id)
                      ? 'detail-compare-btn active' : 'detail-compare-btn'
                  }
                  onClick={() => handleCompare(displayProduct)}
                >
                  {isComparing(displayProduct.id)
                    ? '✓ Đã thêm so sánh'
                    : '+ So sánh'}
                </button>
              </div>
            </div>
          </section>

          <section className="quick-specs-section">
            <h2>Thông số nhanh</h2>

            <div className="quick-specs-grid">
              <div>
                <strong>Màn hình</strong>
                <span>{specs.screen}</span>
              </div>

              <div>
                <strong>Chip</strong>
                <span>{specs.chip}</span>
              </div>

              <div>
                <strong>RAM</strong>
                <span>{specs.ram}</span>
              </div>

              <div>
                <strong>Bộ nhớ</strong>
                <span>{specs.rom}</span>
              </div>

              <div>
                <strong>Camera</strong>
                <span>{specs.camera}</span>
              </div>

              <div>
                <strong>Pin</strong>
                <span>{specs.battery}</span>
              </div>
            </div>
          </section>

          <section className="detail-specs-section">
            <h2>Thông số kỹ thuật chi tiết</h2>

            <div className="detail-specs-table">
              <div className="spec-group-title">Cấu hình bộ nhớ</div>

              <div className="spec-row">
                <span>RAM</span>
                <strong>{specs.memory.ram}</strong>
              </div>

              <div className="spec-row">
                <span>Bộ nhớ trong</span>
                <strong>{specs.memory.storage}</strong>
              </div>

              <div className="spec-row">
                <span>Thẻ nhớ</span>
                <strong>{specs.memory.card}</strong>
              </div>

              <div className="spec-group-title">Camera và màn hình</div>

              <div className="spec-row">
                <span>Màn hình</span>
                <strong>{specs.displayCamera.display}</strong>
              </div>

              <div className="spec-row">
                <span>Camera sau</span>
                <strong>{specs.displayCamera.rearCamera}</strong>
              </div>

              <div className="spec-row">
                <span>Camera trước</span>
                <strong>{specs.displayCamera.frontCamera}</strong>
              </div>

              <div className="spec-group-title">Pin và sạc</div>

              <div className="spec-row">
                <span>Dung lượng pin</span>
                <strong>{specs.batteryCharge.battery}</strong>
              </div>

              <div className="spec-row">
                <span>Sạc nhanh</span>
                <strong>{specs.batteryCharge.charge}</strong>
              </div>

              <div className="spec-row">
                <span>Sạc không dây</span>
                <strong>{specs.batteryCharge.wireless}</strong>
              </div>

              <div className="spec-group-title">Tiện ích</div>

              <div className="spec-row">
                <span>Bảo mật</span>
                <strong>{specs.utilities.security}</strong>
              </div>

              <div className="spec-row">
                <span>Kháng nước</span>
                <strong>{specs.utilities.waterResistant}</strong>
              </div>

              <div className="spec-row">
                <span>Tính năng đặc biệt</span>
                <strong>{specs.utilities.special}</strong>
              </div>

              <div className="spec-group-title">Kết nối</div>

              <div className="spec-row">
                <span>SIM</span>
                <strong>{specs.connection.sim}</strong>
              </div>

              <div className="spec-row">
                <span>Mạng di động</span>
                <strong>{specs.connection.network}</strong>
              </div>

              <div className="spec-row">
                <span>Cổng sạc</span>
                <strong>{specs.connection.port}</strong>
              </div>

              <div className="spec-group-title">Thiết kế</div>

              <div className="spec-row">
                <span>Chất liệu</span>
                <strong>{specs.design.material}</strong>
              </div>

              <div className="spec-row">
                <span>Trọng lượng</span>
                <strong>{specs.design.weight}</strong>
              </div>

              <div className="spec-row">
                <span>Màu sắc</span>
                <strong>{specs.design.color}</strong>
              </div>
            </div>
          </section>

          <ProductReviews productId={product.id} />

          <section className="related-products-section">
            <div className="related-header">
              <h2>Sản phẩm liên quan</h2>
              <p>Các mẫu điện thoại có thể bạn cũng quan tâm</p>
            </div>

            <div className="related-products-grid">
              {relatedProducts.map((item) => {
                const itemOldPrice = item.oldPrice || 0
                const itemDiscount = itemOldPrice - item.price
                const itemOutOfStock =
                  Number(item.quantity) <= 0 || item.status !== 'active'

                return (
                  <div
                    className="related-product-card"
                    key={item.id}
                    onClick={() => navigate(`/products/${item.id}`)}
                  >
                    <div className="related-image-box">
                      <img src={item.image} alt={item.name} />

                      <button
                        className={
                          isComparing(item.id)
                            ? 'related-compare-btn active'
                            : 'related-compare-btn'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCompare(item)
                        }}
                      >
                        {isComparing(item.id) ? '✓' : '+'}
                      </button>

                      {itemDiscount > 0 && (
                        <span className="related-discount-badge">
                          -{Math.round(itemDiscount / 1000000)}tr
                        </span>
                      )}
                    </div>

                    <div className="related-info">
                      <h3>{item.name}</h3>

                      <div className="related-price-row">
                        <strong>{formatPrice(item.price)}</strong>

                        {itemOldPrice > item.price && (
                          <span>{formatPrice(itemOldPrice)}</span>
                        )}
                      </div>

                      <div className="related-rating">
                        <RatingStars rating={item.rating || 5} size="sm" />
                        <small>({item.reviews || 0})</small>
                      </div>

                      <button
                        className="related-buy-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCart(item)
                        }}
                        disabled={itemOutOfStock}
                      >
                        {itemOutOfStock ? 'Hết hàng' : 'Mua ngay'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default ProductDetail