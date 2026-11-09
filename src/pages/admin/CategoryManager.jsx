import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection, { AdminFields } from '../../components/AdminFormSection'

function CategoryManager() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    getCategories()
    getProducts()
  }, [])

  const getCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getProducts = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data)
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
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    })

    setEditId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name) {
      alert('Vui lòng nhập tên danh mục')
      return
    }

    try {
      if (editId) {
        await api.put(`/categories/${editId}`, formData)
        alert('Cập nhật danh mục thành công')
      } else {
        const newCategory = {
          id: Date.now().toString(),
          name: formData.name,
          description: formData.description
        }

        await api.post('/categories', newCategory)
        alert('Thêm danh mục thành công')
      }

      resetForm()
      getCategories()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (category) => {
    setEditId(category.id)

    setFormData({
      name: category.name,
      description: category.description
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleDelete = async (id) => {
    const hasProduct = products.some((product) => product.categoryId === id)

    if (hasProduct) {
      alert('Không thể xóa danh mục này vì đang có sản phẩm thuộc danh mục')
      return
    }

    const confirmDelete = window.confirm('Bạn có chắc muốn xóa danh mục này không?')

    if (!confirmDelete) return

    try {
      await api.delete(`/categories/${id}`)
      alert('Xóa danh mục thành công')
      getCategories()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi xóa')
    }
  }

  const countProductByCategory = (categoryId) => {
    return products.filter((product) => product.categoryId === categoryId).length
  }

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý danh mục</h2>

      <div className="card mb-4">
        <div className="card-header fw-bold">
          {editId ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-entry-form">
            <AdminFormSection number="01" title="Thông tin danh mục" description="Dùng tên hãng hoặc nhóm sản phẩm dễ nhận biết."><AdminFields fields={[{"name":"name","label":"Tên danh mục","required":true,"width":"col-md-4","placeholder":"Ví dụ: Apple, Samsung"},{"name":"description","label":"Mô tả","type":"textarea","width":"col-md-8","rows":3,"placeholder":"Mô tả ngắn về danh mục"}]} values={formData} onChange={handleChange} idPrefix="categorymanager" /></AdminFormSection>
            <div className="admin-form-actions"><button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm mới'}</button>{editId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Hủy sửa</button>}<small><span className="admin-required">*</span> Thông tin bắt buộc</small></div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-bold">
          Danh sách danh mục
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle text-center">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Số sản phẩm</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category, index) => (
                  <tr key={category.id}>
                    <td>{index + 1}</td>
                    <td>{category.name}</td>
                    <td>{category.description}</td>
                    <td>
                      <span className="badge bg-info text-dark">
                        {countProductByCategory(category.id)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(category)}
                      >
                        Sửa
                      </button>

                      {/* <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(category.id)}
                      >
                        Xóa
                      </button> */}
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      Chưa có danh mục nào.
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

export default CategoryManager