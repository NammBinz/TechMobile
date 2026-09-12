import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'

function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (
      !formData.fullName ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.phone
    ) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc')
      return
    }

    if (formData.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp')
      return
    }

    try {
      const res = await api.get('/users')

      const isEmailExist = res.data.find((user) => user.email === formData.email)
      const isUsernameExist = res.data.find((user) => user.username === formData.username)

      if (isEmailExist) {
        alert('Email đã tồn tại')
        return
      }

      if (isUsernameExist) {
        alert('Tên đăng nhập đã tồn tại')
        return
      }

      const newUser = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        role: 'customer',
        status: 'active',
        createdAt: new Date().toLocaleDateString('vi-VN')
      }

      await api.post('/users', newUser)

      alert('Đăng ký thành công')
      navigate('/login')
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi đăng ký')
    }
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="text-center mb-4">Đăng ký tài khoản</h3>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Họ tên</label>
                  <input
                    type="text"
                    className="form-control"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Tên đăng nhập</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Địa chỉ</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  Đăng ký
                </button>
              </form>

              <p className="text-center mt-3">
                Đã có tài khoản?{' '}
                <Link to="/login">Đăng nhập</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register