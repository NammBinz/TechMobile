import { Link } from 'react-router-dom'
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaPhoneAlt,
  FaEnvelope,     // email
  FaMapMarkerAlt, // địa chỉ
  FaShieldAlt,
  FaTruck,
  FaUndoAlt,
  FaCreditCard
} from 'react-icons/fa'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="container">
          <div className="footer-benefits">
            <div className="footer-benefit-item">
              <FaShieldAlt />
              <div>
                <strong>Chính hãng 100%</strong>
                <span>Bảo hành rõ ràng</span>
              </div>
            </div>

            <div className="footer-benefit-item">
              <FaTruck />
              <div>
                <strong>Giao hàng nhanh</strong>
                <span>Toàn quốc</span>
              </div>
            </div>

            <div className="footer-benefit-item">
              <FaUndoAlt />
              <div>
                <strong>Đổi trả 7 ngày</strong>
                <span>Hỗ trợ linh hoạt</span>
              </div>
            </div>

            <div className="footer-benefit-item">
              <FaCreditCard />
              <div>
                <strong>Thanh toán dễ dàng</strong>
                <span>COD hoặc chuyển khoản</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <img
                  src="/IMG/logo.png"
                  alt="TechMobile Logo"
                  className="footer-logo-img"
                />

                <h2>TechMobile</h2>
              </div>

              <p>
                Website bán điện thoại hỗ trợ tìm kiếm, so sánh sản phẩm,
                giỏ hàng, thanh toán, lịch sử mua hàng và quản lý đơn hàng.
              </p>

              <div className="footer-socials">
                <a href="https://facebook.com" target="_blank" rel="noreferrer">
                  <FaFacebookF />
                </a>

                <a href="https://instagram.com" target="_blank" rel="noreferrer">
                  <FaInstagram />
                </a>

                <a href="https://youtube.com" target="_blank" rel="noreferrer">
                  <FaYoutube />
                </a>
              </div>
            </div>

            <div className="footer-column">
              <h3>Danh mục</h3>

              <Link to="/">Trang chủ</Link>
              <Link to="/products">Sản phẩm</Link>
              <Link to="/cart">Giỏ hàng</Link>
              <Link to="/orders">Lịch sử mua hàng</Link>
            </div>

            <div className="footer-column">
              <h3>Chính sách</h3>

              <p>Bảo hành chính hãng 12 tháng</p>
              <p>Đổi trả trong 7 ngày</p>
              <p>Kiểm tra hàng khi nhận</p>
              <p>Bảo mật thông tin khách hàng</p>
            </div>

            <div className="footer-column footer-contact">
              <h3>Liên hệ</h3>

              <p>
                <FaPhoneAlt />
                <span>1900 1234</span>
              </p>

              <p>
                <FaEnvelope />
                <span>support@techmobile.vn</span>
              </p>

              <p>
                <FaMapMarkerAlt />
                <span>Hà Nội, Việt Nam</span>
              </p>

              <div className="footer-hotline-box">
                <span>Hotline hỗ trợ: 
                  <strong> 8:00 - 22:00</strong>
                </span>

              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>
              © 2026 TechMobile. Nơi cung cấp điện thoại chính hãng số 1 Việt Nam.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer