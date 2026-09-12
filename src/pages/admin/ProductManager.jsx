import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { formatPrice } from '../../utils/formatPrice'

function ProductManager() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editId, setEditId] = useState(null)
  const [imageError, setImageError] = useState(false)

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
      !formData.price ||
      !formData.quantity
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
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Tên sản phẩm</label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Hã Nếu lấy ảnh local,nh</label>
                <input
                  type="text"
                  className="form-control"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Apple, Samsung..."
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Danh mục</label>
                <select
                  className="form-select"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Đang bán</option>
                  <option value="inactive">Ngừng bán</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Ảnh sản phẩm</label>

                <input
                  type="text"
                  className="form-control"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="/IMG/ten-anh.jpg hoặc link ảnh online"
                />

                <small className="text-muted">
                  Nếu lấy ảnh local, hãy copy ảnh vào thư mục public/IMG rồi nhập url</small>

                {formData.image && (
                  <div className="admin-image-preview mt-3">
                    {!imageError ? (
                      <img
                        src={formData.image}
                        alt="preview"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="admin-image-error">
                        Không hiển thị được ảnh. Kiểm tra lại đường dẫn.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Giá bán</label>
                <input
                  type="number"
                  className="form-control"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Giá gốc</label>
                <input
                  type="number"
                  className="form-control"
                  name="oldPrice"
                  value={formData.oldPrice}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Số lượng</label>
                <input
                  type="number"
                  className="form-control"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Màn hình</label>
                <input
                  type="text"
                  className="form-control"
                  name="screen"
                  value={formData.screen}
                  onChange={handleChange}
                  placeholder="6.9 inch OLED Super Retina XDR, 120Hz ..."
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Camera</label>
                <input
                  type="text"
                  className="form-control"
                  name="camera"
                  placeholder="48MP + 48MP + 48MP"
                  value={formData.camera}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Chip</label>
                <input
                  type="text"
                  className="form-control"
                  name="chip"
                  value={formData.chip}
                  onChange={handleChange}
                  placeholder="Apple A19 Pro ..."
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">RAM</label>
                <input
                  type="text"
                  className="form-control"
                  name="ram"
                  placeholder="8GB, 12GB ..."
                  value={formData.ram}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Bộ nhớ</label>
                <input
                  type="text"
                  className="form-control"
                  name="storage"
                  placeholder="128GB, 256GB ..."
                  value={formData.storage}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Pin</label>
                <input
                  type="text"
                  className="form-control"
                  name="battery"
                  placeholder="5000mAh ..."
                  value={formData.battery}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-2 mb-3">
                <label className="form-label">Sạc</label>
                <input
                  type="text"
                  className="form-control"
                  name="charge"
                  placeholder="60W, 120W ..."
                  value={formData.charge}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-1 mb-3">
                <label className="form-label">Đánh giá</label>
                <input
                  type="number"
                  className="form-control"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  min="1"
                  max="5"
                />
              </div>

              <div className="col-md-1 mb-3">
                <label className="form-label">Số lượt</label>
                <input
                  type="number"
                  className="form-control"
                  name="reviews"
                  value={formData.reviews}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-12 mb-3">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                ></textarea>
              </div>
            </div>

            <button type="submit" className="btn btn-primary me-2">
              {editId ? 'Cập nhật' : 'Thêm mới'}
            </button>

            {editId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Hủy sửa
              </button>
            )}
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
    </AdminLayout>
  )
}

export default ProductManager