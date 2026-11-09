import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection, { AdminFields } from '../../components/AdminFormSection'
import { formatPrice } from '../../utils/formatPrice'
import VariantEditor from '../../components/VariantEditor'

function ProductManager() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editId, setEditId] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [variantProduct, setVariantProduct] = useState(null)

  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    categoryId: '',
    image: '',
    price: '',
    oldPrice: '',
    rating: 5,
    reviews: 0,
    screen: '',
    chip: '',
    ram: '',
    storage: '',
    camera: '',
    battery: '',
    charge: '',
    quantity: '',
    description: '',
    status: 'active'
  })

  useEffect(() => {
    getProducts()
    getCategories()
  }, [])

  const getProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value
    })

    if (name === 'image') {
      setImageError(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      categoryId: '',
      image: '',
      price: '',
      oldPrice: '',
      rating: 5,
      reviews: 0,
      screen: '',
      chip: '',
      ram: '',
      storage: '',
      camera: '',
      battery: '',
      charge: '',
      quantity: '',
      description: '',
      status: 'active'
    })

    setEditId(null)
    setImageError(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (
      !formData.name ||
      !formData.brand ||
      !formData.categoryId ||
      !formData.image ||
      !formData.price
    ) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc')
      return
    }

    const productData = {
      ...formData,
      price: Number(formData.price),
      oldPrice: Number(formData.oldPrice),
      msrp: Number(formData.oldPrice),
      rating: Number(formData.rating),
      reviews: Number(formData.reviews),
      quantity: Number(formData.quantity),
      rom: formData.storage,
      memory: {
        ram: formData.ram,
        storage: formData.storage,
        card: 'Không hỗ trợ thẻ nhớ'
      },
      displayCamera: {
        display: formData.screen,
        rearCamera: formData.camera,
        frontCamera: 'Đang cập nhật'
      },
      batteryCharge: {
        battery: formData.battery,
        charge: formData.charge,
        wireless: 'Tùy phiên bản'
      },
      utilities: {
        security: 'Đang cập nhật',
        waterResistant: 'Tùy phiên bản',
        special: 'Đang cập nhật'
      },
      connection: {
        sim: 'Nano SIM',
        network: '5G',
        port: 'USB-C'
      },
      design: {
        material: 'Đang cập nhật',
        weight: 'Đang cập nhật',
        color: 'Đang cập nhật'
      }
    }

    try {
      if (editId) {
        await api.put(`/products/${editId}`, productData)
        alert('Cập nhật sản phẩm thành công')
      } else {
        await api.post('/products', {
          id: Date.now().toString(),
          ...productData
        })
        alert('Thêm sản phẩm thành công')
      }

      resetForm()
      getProducts()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (product) => {
    setEditId(product.id)
    setImageError(false)

    setFormData({
      name: product.name || '',
      brand: product.brand || '',
      categoryId: product.categoryId || '',
      image: product.image || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      rating: product.rating || 5,
      reviews: product.reviews || 0,
      screen: product.screen || '',
      chip: product.chip || '',
      ram: product.ram || '',
      storage: product.storage || '',
      camera: product.camera || '',
      battery: product.battery || '',
      charge: product.charge || '',
      quantity: product.quantity || '',
      description: product.description || '',
      status: product.status || 'active'
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleStopSelling = async (product) => {
    const confirmStop = window.confirm(
      `Bạn có chắc muốn ngừng bán sản phẩm "${product.name}" không?`
    )

    if (!confirmStop) return

    try {
      await api.patch(`/products/${product.id}`, {
        status: 'inactive'
      })

      alert('Đã chuyển sản phẩm sang trạng thái ngừng bán')
      getProducts()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi ngừng bán sản phẩm')
    }
  }

  const handleResumeSelling = async (product) => {
    const confirmResume = window.confirm(
      `Bạn có chắc muốn bán lại sản phẩm "${product.name}" không?`
    )

    if (!confirmResume) return

    try {
      await api.patch(`/products/${product.id}`, {
        status: 'active'
      })

      alert('Đã chuyển sản phẩm sang trạng thái đang bán')
      getProducts()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi bán lại sản phẩm')
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.brand.toLowerCase().includes(search.toLowerCase())

    const matchBrand = brandFilter === 'all' || product.brand === brandFilter

    const stock = Number(product.quantity)

    let matchStock = true

    if (stockFilter === 'inStock') {
      matchStock = stock > 5
    }

    if (stockFilter === 'lowStock') {
      matchStock = stock > 0 && stock <= 5
    }

    if (stockFilter === 'outStock') {
      matchStock = stock <= 0
    }

    return matchSearch && matchBrand && matchStock
  })

  const brands = [...new Set(products.map((product) => product.brand))]

  const getStockStatus = (quantity) => {
    const stock = Number(quantity)

    if (stock <= 0) {
      return {
        text: 'Hết hàng',
        className: 'badge bg-danger'
      }
    }

    if (stock <= 5) {
      return {
        text: 'Sắp hết',
        className: 'badge bg-warning text-dark'
      }
    }

    return {
      text: 'Còn hàng',
      className: 'badge bg-success'
    }
  }

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý sản phẩm</h2>

      <div className="card mb-4">
        <div className="card-header fw-bold">
          {editId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-entry-form">
            <AdminFormSection number="01" title="Thông tin sản phẩm" description="Tên, hãng và danh mục giúp khách hàng tìm đúng điện thoại."><AdminFields fields={[{"name":"name","label":"Tên sản phẩm","required":true,"width":"col-lg-6","placeholder":"Ví dụ: iPhone 17 Pro Max"},{"name":"brand","label":"Hãng","required":true,"width":"col-sm-6 col-lg-3","placeholder":"Apple, Samsung…"},{"name":"categoryId","label":"Danh mục","required":true,"type":"select","width":"col-sm-6 col-lg-3","options":[{ value: '', label: 'Chọn danh mục' }, ...categories.map(category => ({ value: category.id, label: category.name }))]},{"name":"image","label":"Ảnh sản phẩm","required":true,"width":"col-lg-8","placeholder":"/IMG/ten-anh.jpg hoặc URL ảnh","hint":"Ảnh trong public/IMG dùng đường dẫn /IMG/ten-anh.jpg."},{"name":"status","label":"Trạng thái bán","type":"select","width":"col-lg-4","options":[{"value":"active","label":"Đang bán"},{"value":"inactive","label":"Ngừng bán"}]}]} values={formData} onChange={handleChange} idPrefix="productmanager" />{formData.image && <div className="admin-product-preview">{!imageError ? <img src={formData.image} alt="Xem trước sản phẩm" onError={() => setImageError(true)} /> : <span className="text-danger">Không tải được ảnh</span>}<p>Xem trước ảnh sản phẩm<br />{formData.name || 'Chưa nhập tên sản phẩm'}</p></div>}</AdminFormSection>
            <AdminFormSection number="02" title="Giá và tồn kho" description="Giá từng phiên bản được chỉnh ở mục Phiên bản; tồn được cập nhật khi nhập máy."><AdminFields fields={[{"name":"price","label":"Giá bán (₫)","required":true,"type":"number","min":0,"readOnly":!!editId,"width":"col-md-4","hint":editId ? 'Sửa giá cụ thể ở nút Phiên bản của sản phẩm.' : 'Giá khởi tạo cho phiên bản mặc định.'},{"name":"oldPrice","label":"Giá gốc (₫)","type":"number","min":0,"readOnly":!!editId,"width":"col-md-4"},{"name":"quantity","label":"Tồn từ IMEI","type":"number","readOnly":true,"width":"col-md-4","placeholder":"0","hint":"Chỉ đọc. Nhập máy tại IMEI và tồn kho."}]} values={formData} onChange={handleChange} idPrefix="productmanager" /></AdminFormSection>
            <AdminFormSection number="03" title="Thông số kỹ thuật" description="Nhập thông số ngắn gọn, kèm đơn vị để dễ đọc trên trang chi tiết."><AdminFields fields={[{"name":"screen","label":"Màn hình","placeholder":"6.9 inch OLED, 120Hz"},{"name":"camera","label":"Camera","placeholder":"48MP + 48MP + 48MP"},{"name":"chip","label":"Chip xử lí","width":"col-md-4","placeholder":"Apple A19 Pro"},{"name":"ram","label":"RAM","width":"col-md-4","placeholder":"12GB"},{"name":"storage","label":"Dung lượng","width":"col-md-4","placeholder":"256GB"},{"name":"battery","label":"Dung lượng pin","width":"col-md-4","placeholder":"5000mAh"},{"name":"charge","label":"Công suất sạc","width":"col-md-4","placeholder":"60W"},{"name":"rating","label":"Đánh giá","type":"number","min":1,"max":5,"width":"col-6 col-md-2"},{"name":"reviews","label":"Số lượt đánh giá","type":"number","min":0,"width":"col-6 col-md-2"}]} values={formData} onChange={handleChange} idPrefix="productmanager" /></AdminFormSection>
            <AdminFormSection number="04" title="Mô tả sản phẩm" description="Thông tin nổi bật và nội dung giới thiệu cho khách hàng."><AdminFields fields={[{"name":"description","label":"Mô tả","type":"textarea","rows":4,"width":"col-12","placeholder":"Điểm nổi bật, thiết kế, trải nghiệm sử dụng…"}]} values={formData} onChange={handleChange} idPrefix="productmanager" /></AdminFormSection>
            <div className="admin-form-actions"><button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm mới'}</button>{editId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Hủy sửa</button>}<small><span className="admin-required">*</span> Thông tin bắt buộc</small></div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-bold">
          Danh sách sản phẩm
        </div>

        <div className="card-body border-bottom">
          <div className="row">
            <div className="col-md-4 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo tên sản phẩm hoặc hãng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-3 mb-2">
              <select
                className="form-select"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="all">Tất cả hãng</option>

                {brands.map((brand) => (
                  <option value={brand} key={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-2">
              <select
                className="form-select"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">Tất cả tồn kho</option>
                <option value="inStock">Còn hàng</option>
                <option value="lowStock">Sắp hết hàng</option>
                <option value="outStock">Hết hàng</option>
              </select>
            </div>

            <div className="col-md-2 mb-2">
              <button
                className="btn btn-outline-danger w-100"
                onClick={() => {
                  setSearch('')
                  setBrandFilter('all')
                  setStockFilter('all')
                }}
              >
                Xóa lọc
              </button>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle text-center">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Hãng</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '70px', height: '70px', objectFit: 'contain' }}
                      />
                    </td>

                    <td>{product.name}</td>
                    <td>{product.brand}</td>
                    <td className="text-danger fw-bold">
                      {formatPrice(product.price)}
                    </td>
                    <td>
                      <div className="fw-bold">{product.quantity}</div>

                      <span className={getStockStatus(product.quantity).className}>
                        {getStockStatus(product.quantity).text}
                      </span>
                    </td>

                    <td>
                      {product.status === 'active' ? (
                        <span className="badge bg-success">Đang bán</span>
                      ) : (
                        <span className="badge bg-secondary">Ngừng bán</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(product)}
                      >
                        Sửa
                      </button>
                      <button className="btn btn-outline-primary btn-sm me-2" onClick={() => { setVariantProduct(product); window.setTimeout(() => document.getElementById('variant-editor')?.scrollIntoView({ behavior: 'smooth' }), 0) }}>Phiên bản</button>

                      {product.status === 'active' ? (
                        <button
                          className="btn btn-warning btn-danger btn-sm"
                          onClick={() => handleStopSelling(product)}
                        >
                          Ngừng bán
                        </button>
                      ) : (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleResumeSelling(product)}
                        >
                          Bán lại
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      Chưa có sản phẩm nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {variantProduct && <div id="variant-editor"><VariantEditor key={variantProduct.id} product={variantProduct} onSaved={async () => { await getProducts(); setVariantProduct(null) }} /></div>}
    </AdminLayout>
  )
}

export default ProductManager
