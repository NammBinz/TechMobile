import { Link } from 'react-router-dom'
import { useState } from 'react'
import { getCurrentUser } from '../utils/auth'

function AdminSidebar() {
  const currentUser = getCurrentUser()
  const [expanded, setExpanded] = useState(false)

  return (
    <aside className="bg-dark text-white p-3 admin-sidebar" aria-label="Menu quản trị">
      <button className="btn btn-outline-light btn-sm admin-menu-toggle" aria-expanded={expanded} aria-controls="admin-navigation" onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn menu quản trị' : 'Mở menu quản trị'}</button>
      <h4 className="mb-4 text-white admin-sidebar-title">
        <strong>Admin Panel</strong>
      </h4>

      <ul id="admin-navigation" className={`nav flex-column admin-navigation${expanded ? ' is-expanded' : ''}`}>
        <li className="nav-item mb-2"><Link className="nav-link text-white" to="/admin/devices">IMEI và tồn kho</Link></li>
        <li className="nav-item mb-2"><Link className="nav-link text-white" to="/admin/warranties">Tra cứu và bảo hành</Link></li>
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
    </aside>
  )
}

export default AdminSidebar
