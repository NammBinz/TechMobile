import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { saveCurrentUser } from '../../utils/auth'

function Login() {
  const [formData, setFormData] = useState({
    account: '',
    password: ''
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

    if (!formData.account || !formData.password) {
      alert('Vui lòng nhập đầy đủ thông tin')
      return
    }

    try {
      const res = await api.get('/users')

      const user = res.data.find((item) => {
        const matchAccount =
          item.email === formData.account ||
          item.username === formData.account

        const matchPassword = item.password === formData.password

        return matchAccount && matchPassword
      })

      if (!user) {
        alert('Tài khoản hoặc mật khẩu không đúng')
        return
      }

      if (user.status === 'blocked') {
        alert('Tài khoản đã bị khóa')
        return
      }

      const loginUser = {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        status: user.status
      }

      saveCurrentUser(loginUser)

      alert('Đăng nhập thành công')

      if (user.role === 'admin' || user.role === 'staff') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/'
      }
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi đăng nhập')
    }
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <p></p>
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="text-center mb-4">Đăng nhập</h3>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email hoặc tên đăng nhập</label>
                  <input
                    type="text"
                    className="form-control"
                    name="account"
                    value={formData.account}
                    onChange={handleChange}
                    placeholder="Nhập email hoặc username"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  Đăng nhập
                </button>
              </form>

              <p className="text-center mt-4">
                Chưa có tài khoản?{' '}
                <Link to="/register">Đăng ký ngay</Link>
              </p>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login