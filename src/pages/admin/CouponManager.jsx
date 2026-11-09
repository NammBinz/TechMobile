import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection, { AdminFields } from '../../components/AdminFormSection'
import { formatPrice } from '../../utils/formatPrice'

function CouponManager() {
  const [coupons, setCoupons] = useState([])
  const [editId, setEditId] = useState(null)

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percent',
    discount: '',
    status: 'active'
  })

  useEffect(() => {
    getCoupons()
  }, [])

  const getCoupons = async () => {
    try {
      const res = await api.get('/coupons')
      setCoupons(res.data)
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
      code: '',
      discountType: 'percent',
      discount: '',
      status: 'active'
    })

    setEditId(null)
  }

  const validateDiscount = () => {
    const discount = Number(formData.discount)

    if (discount <= 0) {
      alert('Giá trị giảm phải lớn hơn 0')
      return false
    }

    if (formData.discountType === 'percent' && discount > 100) {
      alert('Giảm theo phần trăm phải từ 1 đến 100')
      return false
    }

    if (formData.discountType === 'amount' && discount < 1000) {
      alert('Giảm theo số tiền nên từ 1.000đ trở lên')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.code || !formData.discount) {
      alert('Vui lòng nhập đầy đủ mã giảm giá và giá trị giảm')
      return
    }

    if (!validateDiscount()) return

    try {
      const res = await api.get('/coupons')

      const isCodeExist = res.data.find((coupon) => {
        return (
          coupon.code.toLowerCase() === formData.code.toLowerCase() &&
          coupon.id !== editId
        )
      })

      if (isCodeExist) {
        alert('Mã giảm giá đã tồn tại')
        return
      }

      const couponData = {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discount: Number(formData.discount),
        status: formData.status
      }

      if (editId) {
        await api.put(`/coupons/${editId}`, {
          id: editId,
          ...couponData
        })

        alert('Cập nhật mã giảm giá thành công')
      } else {
        await api.post('/coupons', {
          id: Date.now().toString(),
          ...couponData
        })

        alert('Thêm mã giảm giá thành công')
      }

      resetForm()
      getCoupons()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (coupon) => {
    setEditId(coupon.id)

    setFormData({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percent',
      discount: coupon.discount || '',
      status: coupon.status || 'active'
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa mã giảm giá này không?')

    if (!confirmDelete) return

    try {
      await api.delete(`/coupons/${id}`)
      alert('Xóa mã giảm giá thành công')
      getCoupons()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi xóa')
    }
  }

  const handleToggleStatus = async (coupon) => {
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active'

    try {
      await api.patch(`/coupons/${coupon.id}`, {
        status: newStatus
      })

      alert(newStatus === 'active' ? 'Đã kích hoạt mã' : 'Đã ngừng mã')
      getCoupons()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi đổi trạng thái')
    }
  }

  const getDiscountText = (coupon) => {
    if (coupon.discountType === 'amount') {
      return formatPrice(coupon.discount)
    }

    return `${coupon.discount}%`
  }

  const getDiscountTypeText = (type) => {
    if (type === 'amount') return 'Theo số tiền'
    return 'Theo phần trăm'
  }

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý mã giảm giá</h2>

      <div className="card mb-4">
        <div className="card-header fw-bold">
          {editId ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá mới'}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} className="admin-entry-form">
            <AdminFormSection number="01" title="Thiết lập ưu đãi" description="Chọn giảm theo phần trăm hoặc số tiền cố định."><AdminFields fields={[{"name":"code","label":"Mã giảm giá","required":true,"width":"col-md-6 col-xl-3","placeholder":"Ví dụ: SALE10","hint":"Mã không trùng với các mã đã tạo."},{"name":"discountType","label":"Loại ưu đãi","type":"select","width":"col-md-6 col-xl-3","options":[{"value":"percent","label":"Theo phần trăm (%)"},{"value":"amount","label":"Theo số tiền (₫)"}]},{"name":"discount","label":formData.discountType === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (₫)',"required":true,"type":"number","min":1,"width":"col-md-6 col-xl-3","hint":"Giảm phần trăm tối đa 100%; số tiền từ 1.000₫."},{"name":"status","label":"Trạng thái","type":"select","width":"col-md-6 col-xl-3","options":[{"value":"active","label":"Đang hoạt động"},{"value":"inactive","label":"Ngừng hoạt động"}]}]} values={formData} onChange={handleChange} idPrefix="couponmanager" /></AdminFormSection>
            <div className="admin-form-actions"><button type="submit" className="btn btn-primary">{editId ? 'Cập nhật' : 'Thêm mới'}</button>{editId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Hủy sửa</button>}<small><span className="admin-required">*</span> Thông tin bắt buộc</small></div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-bold">
          Danh sách mã giảm giá
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle text-center">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã giảm giá</th>
                  <th>Loại giảm</th>
                  <th>Giá trị giảm</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon, index) => (
                  <tr key={coupon.id}>
                    <td>{index + 1}</td>

                    <td>
                      <span className="badge bg-danger fs-6">
                        {coupon.code}
                      </span>
                    </td>

                    <td>{getDiscountTypeText(coupon.discountType)}</td>

                    <td className="fw-bold text-danger">
                      {getDiscountText(coupon)}
                    </td>

                    <td>
                      {coupon.status === 'active' ? (
                        <span className="badge bg-success">Đang hoạt động</span>
                      ) : (
                        <span className="badge bg-secondary">Ngừng hoạt động</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(coupon)}
                      >
                        Sửa
                      </button>

                      <button
                        className={
                          coupon.status === 'active'
                            ? 'btn btn-secondary btn-sm me-2'
                            : 'btn btn-success btn-sm me-2'
                        }
                        onClick={() => handleToggleStatus(coupon)}
                      >
                        {coupon.status === 'active' ? 'Ngừng' : 'Kích hoạt'}
                      </button>

                      {/* <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        Xóa
                      </button> */}
                    </td>
                  </tr>
                ))}

                {coupons.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      Chưa có mã giảm giá nào.
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

export default CouponManager