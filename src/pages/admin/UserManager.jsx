import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

function UserManager() {
  const [users, setUsers] = useState([])
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'customer',
    status: 'active'
  })

  useEffect(() => {
    getUsers()
  }, [])

  const getUsers = async () => {
    try {
      const res = await api.get('/users')
      setUsers(res.data)
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
      fullName: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      role: 'customer',
      status: 'active'
    })

    setEditId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (
      !formData.fullName ||
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.phone
    ) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc')
      return
    }

    if (formData.password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    try {
      const res = await api.get('/users')

      const isUsernameExist = res.data.find((user) => {
        return user.username === formData.username && user.id !== editId
      })

      const isEmailExist = res.data.find((user) => {
        return user.email === formData.email && user.id !== editId
      })

      if (isUsernameExist) {
        alert('Tên đăng nhập đã tồn tại')
        return
      }

      if (isEmailExist) {
        alert('Email đã tồn tại')
        return
      }

      if (editId) {
        await api.put(`/users/${editId}`, formData)
        alert('Cập nhật tài khoản thành công')
      } else {
        const newUser = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toLocaleDateString('vi-VN')
        }

        await api.post('/users', newUser)
        alert('Thêm tài khoản thành công')
      }

      resetForm()
      getUsers()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (user) => {
    setEditId(user.id)

    setFormData({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      password: user.password || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || 'customer',
      status: user.status || 'active'
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleToggleStatus = async (user) => {
    if (user.role === 'admin') {
      alert('Không nên khóa tài khoản admin chính')
      return
    }

    const newStatus = user.status === 'active' ? 'blocked' : 'active'

    try {
      await api.patch(`/users/${user.id}`, {
        status: newStatus
      })

      alert(newStatus === 'active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản')
      getUsers()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleDelete = async (user) => {
    if (user.role === 'admin') {
      alert('Không thể xóa tài khoản admin')
      return
    }

    const confirmDelete = window.confirm('Bạn có chắc muốn xóa tài khoản này không?')

    if (!confirmDelete) return

    try {
      await api.delete(`/users/${user.id}`)
      alert('Xóa tài khoản thành công')
      getUsers()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi xóa')
    }
  }

  const getRoleText = (role) => {
    if (role === 'admin') return 'Quản trị viên'
    if (role === 'staff') return 'Nhân viên'
    return 'Khách hàng'
  }

  const filteredUsers = users.filter((user) => {
    const matchSearch =
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.phone.includes(search)

    const matchRole = roleFilter === 'all' || user.role === roleFilter

    return matchSearch && matchRole
  })

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý tài khoản</h2>

      <div className="card mb-4">
        <div className="card-header fw-bold">
          {editId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Họ tên</label>
                <input
                  type="text"
                  className="form-control"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Tên đăng nhập</label>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Mật khẩu</label>
                <input
                  type="text"
                  className="form-control"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Vai trò</label>
                <select
                  className="form-select"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="staff">Nhân viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Hoạt động</option>
                  <option value="blocked">Bị khóa</option>
                </select>
              </div>

              <div className="col-md-8 mb-3">
                <label className="form-label">Địa chỉ</label>
                <input
                  type="text"
                  className="form-control"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                />
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
          Danh sách tài khoản
        </div>

        <div className="card-body border-bottom">
          <div className="row">
            <div className="col-md-6 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo họ tên, username, email, số điện thoại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-4 mb-2">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="customer">Khách hàng</option>
                <option value="staff">Nhân viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>

            <div className="col-md-2 mb-2">
              <button
                className="btn btn-outline-danger w-100"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('all')
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
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>SĐT</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user.fullName}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>

                    <td>
                      {user.role === 'admin' && (
                        <span className="badge bg-danger">
                          {getRoleText(user.role)}
                        </span>
                      )}

                      {user.role === 'staff' && (
                        <span className="badge bg-warning text-dark">
                          {getRoleText(user.role)}
                        </span>
                      )}

                      {user.role === 'customer' && (
                        <span className="badge bg-info text-dark">
                          {getRoleText(user.role)}
                        </span>
                      )}
                    </td>

                    <td>
                      {user.status === 'active' ? (
                        <span className="badge bg-success">Hoạt động</span>
                      ) : (
                        <span className="badge bg-secondary">Bị khóa</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(user)}
                      >
                        Sửa
                      </button>

                      <button
                        className={
                          user.status === 'active'
                            ? 'btn btn-secondary btn-sm me-2'
                            : 'btn btn-success btn-sm me-2'
                        }
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                      </button>
{/* 
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(user)}
                      >
                        Xóa
                      </button> */}
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      Chưa có tài khoản nào.
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

export default UserManager