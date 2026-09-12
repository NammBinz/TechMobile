import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { formatPrice } from '../../utils/formatPrice'
import { getCurrentUser } from '../../utils/auth'
import { showToast, saveCart } from '../../utils/shopActions'

function Checkout() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  const [cart, setCart] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  const [formData, setFormData] = useState({
    receiverName: '',
    phone: '',
    address: '',
    paymentMethod: 'COD',
    note: ''
  })

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('cart')) || []
    setCart(data)

    if (currentUser) {
      setFormData({
        receiverName: currentUser.fullName || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        paymentMethod: 'COD',
        note: ''
      })
    }
  }, [])

  const productTotal = cart.reduce((total, item) => {
    return total + item.price * item.cartQuantity
  }, 0)

  const totalOldPrice = cart.reduce((total, item) => {
    const oldPrice = item.oldPrice || item.msrp || item.price
    return total + oldPrice * item.cartQuantity
  }, 0)

  const productDiscount = totalOldPrice - productTotal

  const getCouponDiscount = (coupon, total) => {
    if (!coupon) return 0

    if (coupon.discountType === 'amount')
      return Math.min(Number(coupon.discount), total)

    return Math.round((total * Number(coupon.discount)) / 100)
  }

  const getCouponText = (coupon) => {
    if (!coupon) return ''

    if (coupon.discountType === 'amount')
      return formatPrice(coupon.discount)

    return `${coupon.discount}%`
  }

  const couponDiscount = appliedCoupon ? getCouponDiscount(appliedCoupon, productTotal) : 0

  const finalTotal = Math.max(productTotal - couponDiscount, 0)

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast('Vui lòng nhập mã giảm giá', 'warning')
      return
    }

    try {
      const res = await api.get('/coupons')

      const coupon = res.data.find((item) => {
        return item.code.toLowerCase() === couponCode.trim().toLowerCase()
      })

      if (!coupon) {
        showToast('Mã giảm giá không tồn tại', 'warning')
        return
      }

      if (coupon.status !== 'active') {
        showToast('Mã giảm giá không còn hiệu lực', 'warning')
        return
      }

      setAppliedCoupon(coupon)
      showToast(`Áp dụng mã ${coupon.code} thành công`, 'success')
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi kiểm tra mã giảm giá', 'warning')
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    showToast('Đã bỏ mã giảm giá', 'info')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentUser) {
      showToast('Bạn cần đăng nhập trước khi thanh toán', 'warning')
      navigate('/login')
      return
    }

    if (cart.length === 0) {
      showToast('Giỏ hàng đang trống', 'warning')
      return
    }

    if (!formData.receiverName || !formData.phone || !formData.address) {
      showToast('Vui lòng nhập đầy đủ thông tin nhận hàng', 'warning')
      return
    }

    for (const item of cart) {
      const productId = item.productId || item.id
      const productRes = await api.get(`/products/${productId}`)
      const latestProduct = productRes.data

      if (latestProduct.status !== 'active') {
        showToast(`Sản phẩm ${latestProduct.name} hiện không còn kinh doanh`, 'warning')
        return
      }

      if (Number(latestProduct.quantity) <= 0) {
        showToast(`Sản phẩm ${latestProduct.name} đã hết hàng`, 'warning')
        return
      }

      if (item.cartQuantity > Number(latestProduct.quantity)) {
        showToast(
          `Sản phẩm ${latestProduct.name} chỉ còn ${latestProduct.quantity} sản phẩm`,
          'warning'
        )
        return
      }
    }

    const newOrder = {
      id: Date.now().toString(),
      userId: currentUser.id,
      customerName: currentUser.fullName,
      items: cart.map((item) => ({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.cartQuantity,
        image: item.image
      })),
      coupon: appliedCoupon
        ? {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType || 'percent',
          discount: appliedCoupon.discount
        }
        : null,
      couponDiscount: couponDiscount,
      totalPrice: finalTotal,
      receiverName: formData.receiverName,
      phone: formData.phone,
      address: formData.address,
      paymentMethod: formData.paymentMethod,
      paymentStatus: 'unpaid',
      paidAt: null,
      paidBy: null,
      note: formData.note,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('vi-VN')
    }

    try {
      await api.post('/orders', newOrder)

      // Trừ tồn kho
      for (const item of cart) {
        const productId = item.productId || item.id
        const productRes = await api.get(`/products/${productId}`)
        const latestProduct = productRes.data

        await api.patch(`/products/${productId}`, {
          quantity: Number(latestProduct.quantity) - Number(item.cartQuantity)
        })
      }

      saveCart([])
      setCart([])

      showToast('Đặt hàng thành công', 'success')

      setTimeout(() => {
        navigate('/orders')
      }, 500)
    } catch (error) {
      console.log(error)
      showToast('Có lỗi xảy ra khi đặt hàng', 'warning')
    }
  }

  if (cart.length === 0) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Thanh toán</h2>
            <p>Giỏ hàng đang trống.</p>

            <Link to="/products" className="back-home-btn">
              Quay lại mua hàng
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="container">
        <h2 className="mb-4">Thanh toán</h2>

        {!currentUser && (
          <div className="alert alert-warning">
            Bạn cần đăng nhập trước khi thanh toán.
          </div>
        )}

        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header fw-bold">
                Thông tin nhận hàng
              </div>

              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Họ tên người nhận</label>
                    <input
                      type="text"
                      className="form-control"
                      name="receiverName"
                      value={formData.receiverName}
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
                    <label className="form-label">Địa chỉ giao hàng</label>
                    <textarea
                      className="form-control"
                      name="address"
                      rows="2"
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Phương thức thanh toán</label>
                    <select
                      className="form-select"
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                    >
                      <option value="COD">Thanh toán khi nhận hàng</option>
                      <option value="BANK">Chuyển khoản ngân hàng</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Ghi chú</label>
                    <textarea
                      className="form-control"
                      name="note"
                      rows="3"
                      value={formData.note}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn btn-success">
                    Xác nhận đặt hàng
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header fw-bold">
                Thông tin đơn hàng
              </div>

              <div className="card-body">
                {cart.map((item) => (
                  <div
                    className="d-flex align-items-center border-bottom py-2"
                    key={item.id}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'contain',
                        marginRight: '12px'
                      }}
                    />

                    <div className="flex-grow-1">
                      <strong>{item.name}</strong>
                      <p className="mb-0 text-muted">
                        Số lượng: {item.cartQuantity}
                      </p>
                    </div>

                    <strong className="text-danger fs-5">
                      {formatPrice(item.price * item.cartQuantity)}
                    </strong>
                  </div>
                ))}

                <div className="mt-3 fs-6">
                  <label className="form-label fw-bold">Mã giảm giá</label>

                  <div className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập mã SALE100..."
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={appliedCoupon !== null}
                    />

                    {appliedCoupon ? (
                      <button
                        className="btn btn-outline-danger"
                        type="button"
                        onClick={handleRemoveCoupon}
                      >
                        Bỏ mã
                      </button>
                    ) : (
                      <button
                        className="btn btn-outline-success"
                        type="button"
                        onClick={handleApplyCoupon}
                      >
                        Áp dụng
                      </button>
                    )}
                  </div>

                  {appliedCoupon && (
                    <div className="alert alert-success py-2">
                      Đã áp dụng mã <strong>{appliedCoupon.code}</strong> giảm{' '}
                      <strong>{getCouponText(appliedCoupon)}</strong>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mb-2">
                    <span>Giá gốc</span>
                    <strong>{formatPrice(totalOldPrice)}</strong>
                  </div>

                  <div className="d-flex justify-content-between mb-2">
                    <span>Giảm giá sản phẩm</span>
                    <strong className="text-success">
                      -{formatPrice(productDiscount)}
                    </strong>
                  </div>

                  {appliedCoupon && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Giảm mã khuyến mãi</span>
                      <strong className="text-success">
                        -{formatPrice(couponDiscount)}
                      </strong>
                    </div>
                  )}

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Tổng thanh toán</span>
                    <strong className="text-danger fs-3">
                      {formatPrice(finalTotal)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <Link to="/cart" className="btn btn-outline-primary w-100 mt-3">
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Checkout