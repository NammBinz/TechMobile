import { Link } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

function AdminSidebar() {
  const currentUser = getCurrentUser()

  return (
    <div className="bg-dark text-white p-3 min-vh-100">
      <h4 className="mb-4 text-white admin-sidebar-title">
        <strong>Admin Panel</strong>
      </h4>

      <ul className="nav flex-column">
        <li className="nav-item mb-2">
          <Link className="nav-link text-white" to="/admin">
            Dashboard
          </Link>
        </li>

        <li className="nav-item mb-2">
          <Link className="nav-link text-white" to="/admin/products">
            Quản lý sản phẩm
          </Link>
        </li>

        {currentUser?.role === 'admin' && (
          <>
            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/admin/categories">
                Quản lý danh mục
              </Link>
            </li>

            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/admin/users">
                Quản lý tài khoản
              </Link>
            </li>

            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/admin/staffs">
                Quản lý nhân sự
              </Link>
            </li>

            <li className="nav-item mb-2">
              <Link className="nav-link text-white" to="/admin/coupons">
                Quản lý mã giảm giá
              </Link>
            </li>
          </>
        )}

        <li className="nav-item mb-2">
          <Link className="nav-link text-white" to="/admin/orders">
            Quản lý đơn hàng
          </Link>
        </li>
      </ul>
    </div>
  )
}

export default AdminSidebar