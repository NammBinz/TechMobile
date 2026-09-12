import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { getCurrentUser, saveCurrentUser } from '../../utils/auth'
import { showToast } from '../../utils/shopActions'

function Profile() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!currentUser) {
      showToast('Bạn cần đăng nhập để xem thông tin tài khoản', 'warning')
      navigate('/login')
      return
    }

    setFormData({
      fullName: currentUser.fullName || '',
      username: currentUser.username || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      address: currentUser.address || '',
      password: '',
      confirmPassword: ''
    })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.fullName || !formData.email || !formData.phone) {
      showToast('Vui lòng nhập đầy đủ họ tên, email và số điện thoại', 'warning')
      return
    }

    if (formData.password && formData.password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'warning')
      return
    }

    try {
      const usersRes = await api.get('/users')

      const isEmailExist = usersRes.data.find((user) => {
        return user.email === formData.email && user.id !== currentUser.id
      })

      if (isEmailExist) {
        showToast('Email đã được sử dụng bởi tài khoản khác', 'warning')
        return
      }

      const oldUserRes = await api.get(`/users/${currentUser.id}`)
      const oldUser = oldUserRes.data

      const updatedUser = {
        ...oldUser,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password ? formData.password : oldUser.password
      }

      await api.put(`/users/${currentUser.id}`, updatedUser)

      const newCurrentUser = {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
        status: updatedUser.status
      }

      saveCurrentUser(newCurrentUser)

      showToast('Cập nhật thông tin tài khoản thành công', 'success')
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi cập nhật tài khoản', 'warning')
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <main className="main">
      <div className="container">
        <div className="profile-page col-md-8 offset-md-2">
          <p></p>
          <div className="profile-header">
            <img
              src="/IMG/avatar-default.png"
              alt="avatar"
              className="profile-avatar"
              onError={(e) => {
                e.currentTarget.src = '/IMG/logo.png'
              }}
            />

            <div>
              <h2>Thông tin tài khoản</h2>
              <p>
                Quản lý thông tin cá nhân và địa chỉ giao hàng của bạn.
              </p>
            </div>
          </div>

          <div className="profile-card">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Họ tên</label>
                  <input
                    type="text"
                    className="form-control"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Tên đăng nhập</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={formData.username}
                    disabled
                  />
                  <small className="text-muted">
                    Tên đăng nhập không thể thay đổi.
                  </small>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label">Địa chỉ giao hàng</label>
                  <textarea
                    className="form-control"
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Bỏ trống nếu không đổi mật khẩu"
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-success">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Profile