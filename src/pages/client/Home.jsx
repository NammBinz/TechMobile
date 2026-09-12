import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import ProductCard from '../../components/ProductCard'

function Home() {
  const [products, setProducts] = useState([])

  const getProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getProducts()
  }, [])

  // lấy 5 sản phẩm đang giảm giá nhiều nhất
  const featuredProducts = [...products]
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 5)

  // lấy 5 sản phẩm đang giảm giá nhiều nhất
  const dealProducts = [...products]
    .filter((product) => product.oldPrice > product.price)
    .slice(0, 5)

  return (
    <main className="main">
      <div className="container">
        <section className="home-hero">
          <div className="home-hero-content">
            <span className="home-badge">TECHMOBILE STORE</span>

            <h1>Điện thoại chính hãng, giá tốt mỗi ngày</h1>

            <p>
              Mua sắm điện thoại dễ dàng, hỗ trợ so sánh sản phẩm, giỏ hàng,
              thanh toán và theo dõi lịch sử mua hàng.
            </p>

            <div className="home-hero-actions">
              <Link to="/products" className="home-primary-btn">
                Xem sản phẩm
              </Link>

              <Link to="/compare" className="home-secondary-btn">
                So sánh điện thoại
              </Link>
            </div>
          </div>

          <div className="home-hero-image">
            <img
              src="/IMG/iphone-15.png"
              alt="Điện thoại nổi bật"
            />
          </div>
        </section>

        <section className="home-brand-section">
          <h2>Thương hiệu nổi bật</h2>

          <div className="home-brand-grid">
            <Link to="/products?search=Apple" className="home-brand-card">
              Apple
            </Link>

            <Link to="/products?search=Samsung" className="home-brand-card">
              Samsung
            </Link>

            <Link to="/products?search=Xiaomi" className="home-brand-card">
              Xiaomi
            </Link>

            <Link to="/products?search=OPPO" className="home-brand-card">
              OPPO
            </Link>

            <Link to="/products?search=Vivo" className="home-brand-card">
              Vivo
            </Link>

            <Link to="/products?search=Realme" className="home-brand-card">
              Realme
            </Link>
          </div>
        </section>

        <section className="home-feature-section">
          <div className="home-section-title">
            <div>
              <h2>Sản phẩm nổi bật</h2>
              <p>Những mẫu điện thoại được quan tâm nhiều nhất</p>
            </div>

            <Link to="/products" className="btn btn-outline-danger">
              Xem tất cả
            </Link>
          </div>

          <div className="product-grid">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </section>

        <section className="home-feature-section">
          <div className="home-section-title">
            <div>
              <h2>Giá tốt hôm nay</h2>
              <p>Các sản phẩm đang có ưu đãi hấp dẫn</p>
            </div>

            <Link to="/products" className="btn btn-outline-danger">
              Mua ngay
            </Link>
          </div>

          <div className="product-grid">
            {dealProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Home