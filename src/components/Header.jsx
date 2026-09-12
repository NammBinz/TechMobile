import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaSearch, FaHistory, FaHeart, FaSignOutAlt } from 'react-icons/fa'
import { getCurrentUser, logout } from '../utils/auth'

function Header() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const [keyword, setKeyword] = useState('')

  const handleSearchSubmit = (e) => {
    e.preventDefault()

    const trimmedKeyword = keyword.trim()

    if (!trimmedKeyword) {
      navigate('/products')
      return
    }

    navigate(`/products?search=${encodeURIComponent(trimmedKeyword)}`)
  }

  const handleLogout = () => {
    const confirmLogout = window.confirm('Bạn có chắc muốn đăng xuất không?')

    if (!confirmLogout) return

    logout()
    navigate('/login')
  }

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-shell">
          <Link to="/" className="navbar-brand-box text-decoration-none">
            <img
              src="/IMG/logo.png"
              alt="TechMobile Logo"
              className="navbar-logo-img"
            />
            <div className="navbar-brand-text">
              <span className="brand-name">TechMobile</span>
              <small>Điện thoại chính hãng</small>
            </div>
          </Link>

          <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
            <FaSearch className="navbar-search-icon" />

            <input
              type="text"
              className="navbar-search-input"
              placeholder="Bạn tìm điện thoại nào..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <button type="submit" className="navbar-search-btn">
              Tìm
            </button>
          </form>

          <div className="navbar-actions">
            {currentUser ? (
              <>
                <Link to="/profile" className="navbar-user-card text-decoration-none">
                  <img
                    src="/IMG/avatar-default.png"
                    alt="avatar"
                    className="navbar-user-avatar"
                  />

                  <div className="navbar-user-meta">
                    <strong>{currentUser.fullName}</strong>
                    <span>{currentUser.role}</span>
                  </div>
                </Link>



                <Link to="/orders" className="navbar-action-pill text-decoration-none">
                  <FaHistory />
                  <span>Đơn hàng</span>
                </Link>

                <Link to="/wishlist" className="navbar-action-pill text-decoration-none">
                  <FaHeart />
                  <span>Yêu thích</span>
                </Link>

                <button className="navbar-logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <div className="navbar-auth-box">
                <Link to="/login" className="navbar-login-btn text-decoration-none">
                  Đăng nhập
                </Link>

                <Link to="/register" className="navbar-register-btn text-decoration-none">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header