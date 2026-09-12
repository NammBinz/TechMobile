import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

function ProtectedRoute({ children, allowedRoles }) {
  const currentUser = getCurrentUser()

  if (!currentUser) {
    alert('Bạn cần đăng nhập để truy cập trang này')
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(currentUser.role)) {
    alert('Bạn không có quyền truy cập trang này')
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute