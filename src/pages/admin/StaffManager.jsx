import { useEffect, useState } from 'react'
import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'

function StaffManager() {
  const [staffs, setStaffs] = useState([])
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
    role: 'staff',
    status: 'active'
  })

  useEffect(() => {
    getStaffs()
  }, [])

  const getStaffs = async () => {
    try {
      const res = await api.get('/users')

      const staffList = res.data.filter((user) => {
        return user.role === 'admin' || user.role === 'staff'
      })

      setStaffs(staffList)
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
      role: 'staff',
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
        alert('Cập nhật nhân sự thành công')
      } else {
        const newStaff = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toLocaleDateString('vi-VN')
        }

        await api.post('/users', newStaff)
        alert('Thêm nhân sự thành công')
      }

      resetForm()
      getStaffs()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra')
    }
  }

  const handleEdit = (staff) => {
    setEditId(staff.id)

    setFormData({
      fullName: staff.fullName || '',
      username: staff.username || '',
      email: staff.email || '',
      password: staff.password || '',
      phone: staff.phone || '',
      address: staff.address || '',
      role: staff.role || 'staff',
      status: staff.status || 'active'
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const handleToggleStatus = async (staff) => {
    if (staff.role === 'admin') {
      alert('Không nên khóa tài khoản admin')
      return
    }

    const newStatus = staff.status === 'active' ? 'blocked' : 'active'

    try {
      await api.patch(`/users/${staff.id}`, {
        status: newStatus
      })

      alert(newStatus === 'active' ? 'Đã mở khóa nhân sự' : 'Đã khóa nhân sự')
      getStaffs()
    } catch (error) {
      console.log(error)
      alert('Có lỗi xảy ra khi cập nhật trạng thái')
    }
  }

  const handleDelete = async (staff) => {
    if (staff.role === 'admin') {
      alert('Không thể xóa tài khoản admin')
      return
    }

    const confirmDelete = window.confirm('Bạn có chắc muốn xóa nhân sự này không?')

    if (!confirmDelete) return

    try {
      await api.delete(`/users/${staff.id}`)
      alert('Xóa nhân sự thành công')
      getStaffs()
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

  const filteredStaffs = staffs.filter((staff) => {
    const matchSearch =
      staff.fullName.toLowerCase().includes(search.toLowerCase()) ||
      staff.username.toLowerCase().includes(search.toLowerCase()) ||
      staff.email.toLowerCase().includes(search.toLowerCase()) ||
      staff.phone.includes(search)

    const matchRole = roleFilter === 'all' || staff.role === roleFilter

    return matchSearch && matchRole
  })

  return (
    <AdminLayout>
      <h2 className="mb-4">Quản lý nhân sự</h2>

      <div className="card mb-4">
        <div className="card-header fw-bold">
          {editId ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}
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
          Danh sách nhân sự
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
                <option value="all">Tất cả nhân sự</option>
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
                {filteredStaffs.map((staff, index) => (
                  <tr key={staff.id}>
                    <td>{index + 1}</td>
                    <td>{staff.fullName}</td>
                    <td>{staff.username}</td>
                    <td>{staff.email}</td>
                    <td>{staff.phone}</td>

                    <td>
                      {staff.role === 'admin' ? (
                        <span className="badge bg-danger">
                          {getRoleText(staff.role)}
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          {getRoleText(staff.role)}
                        </span>
                      )}
                    </td>

                    <td>
                      {staff.status === 'active' ? (
                        <span className="badge bg-success">Hoạt động</span>
                      ) : (
                        <span className="badge bg-secondary">Bị khóa</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleEdit(staff)}
                      >
                        Sửa
                      </button>

                      <button
                        className={
                          staff.status === 'active'
                            ? 'btn btn-secondary btn-sm me-2'
                            : 'btn btn-success btn-sm me-2'
                        }
                        onClick={() => handleToggleStatus(staff)}
                      >
                        {staff.status === 'active' ? 'Khóa' : 'Mở khóa'}
                      </button>

                      {/* <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(staff)}
                      >
                        Xóa
                      </button> */}
                    </td>
                  </tr>
                ))}

                {filteredStaffs.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      Chưa có nhân sự nào.
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

export default StaffManager