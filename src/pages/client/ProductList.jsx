import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProductCard from '../../components/ProductCard'
import api from '../../services/api'

const tabs = [
  { id: 'all', label: '✨ Tất cả' },
  { id: 'bestseller', label: '📈 Bán chạy' },
  { id: 'Apple', label: 'iPhone' },
  { id: 'Samsung', label: 'Samsung' },
  { id: 'Xiaomi', label: 'Xiaomi' },
  { id: 'OPPO', label: 'OPPO' },
  { id: 'Vivo', label: 'Vivo' },
  { id: 'Realme', label: 'Realme' }
]

function ProductList() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')
  const [sort, setSort] = useState('default')

  useEffect(() => {
    getProducts()
  }, [])

  useEffect(() => {
    const keyword = searchParams.get('search') || ''
    setSearch(keyword)
  }, [searchParams])

  const getProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  const resetFilters = (tab = 'all') => {
    setActiveTab(tab)
    setSearch('')
    setPriceFilter('all')
    setSort('default')
    navigate('/products')
  }

  const checkPriceFilter = (product) => {
    if (priceFilter === 'all') return true
    if (priceFilter === 'under10') return product.price < 10000000
    if (priceFilter === '10to20') return product.price >= 10000000 && product.price <= 20000000
    if (priceFilter === '20to30') return product.price > 20000000 && product.price <= 30000000
    if (priceFilter === 'above30') return product.price > 30000000

    return true
  }

  const isProductActive = (product) => {
    if (!product.status) return true

    return (
      product.status === 'active' ||
      product.status === 'Đang bán' ||
      product.status === 'Còn hàng'
    )
  }

  // Lọc theo tab hãng
  const isMatchBrandTab = (product) => {
    if (activeTab === 'all' || activeTab === 'bestseller') return true

    return product.brand === activeTab
  }

  // Lọc theo từ khóa
  const isMatchSearch = (product) => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return true

    return (
      product.name.toLowerCase().includes(keyword) ||
      product.brand.toLowerCase().includes(keyword)
    )
  }

  const filteredProducts = [...products]
    .filter((product) => isProductActive(product))
    .filter((product) => isMatchBrandTab(product))
    .filter((product) => isMatchSearch(product))
    .filter((product) => checkPriceFilter(product))
    .sort((a, b) => {
      if (sort === 'priceAsc') return Number(a.price) - Number(b.price)
      if (sort === 'priceDesc') return Number(b.price) - Number(a.price)
      if (sort === 'ratingDesc') return Number(b.rating || 0) - Number(a.rating || 0)
      if (sort === 'reviewDesc') return Number(b.reviews || 0) - Number(a.reviews || 0)

      if (activeTab === 'bestseller') return Number(b.reviews || 0) - Number(a.reviews || 0)

      return 0
    })

  // Lọc theo tab
  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
    setSearch('')
    navigate('/products')
  }

  return (
    <main className="main">
      <div className="container">
        <div className="promo-banners">
          <div
            className="promo-banner promo-red promo-clickable"
            onClick={() => resetFilters('all')}
          >
            <div className="promo-content">
              <span className="promo-badge">NGẬP TRÀN ƯU ĐÃI</span>
              <h2>Lễ Hội Công Nghệ</h2>
              <p className="promo-price">Giảm đến 50%</p>

              <button type="button" className="promo-btn">Xem ngay</button>
            </div>
          </div>

          <div
            className="promo-banner promo-blue promo-clickable"
            onClick={() => resetFilters('Apple')}
          >
            <div className="promo-content">
              <span className="promo-badge">TRẢ GÓP 0%</span>
              <h2>iPhone 17 Series</h2>
              <p className="promo-price">Giảm thêm 3 triệu</p>

              <button type="button" className="promo-btn">Khám phá</button>
            </div>
          </div>
        </div>

        <div className="product-filter-toolbar">
          <div className="product-filter-left">
            {tabs.map((tab) => (
              <button
                type="button"
                className={activeTab === tab.id ? 'tab-btn active' : 'tab-btn'}
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="product-filter-right">
            <select
              className="filter-select"
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
            >
              <option value="all">Tất cả mức giá</option>
              <option value="under10">Dưới 10 triệu</option>
              <option value="10to20">Từ 10 đến 20 triệu</option>
              <option value="20to30">Từ 20 đến 30 triệu</option>
              <option value="above30">Trên 30 triệu</option>
            </select>

            <select
              className="filter-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="priceAsc">Giá tăng dần</option>
              <option value="priceDesc">Giá giảm dần</option>
              <option value="ratingDesc">Đánh giá cao nhất</option>
              <option value="reviewDesc">Nhiều lượt đánh giá</option>
            </select>

            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => resetFilters('all')}
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="product-section">
          <h2>Điện thoại nổi bật</h2>
          <p className="product-count">
            Hiển thị {filteredProducts.length} sản phẩm
          </p>
        </div>

        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))
          ) : (
            <div className="product-not-found">
              <h2>Không tìm thấy sản phẩm</h2>
              <p>Vui lòng thử từ khóa hoặc bộ lọc khác.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default ProductList