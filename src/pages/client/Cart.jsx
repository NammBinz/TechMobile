import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatPrice'
import { getCart, saveCart, showToast } from '../../utils/shopActions'

function Cart() {
  const [cart, setCart] = useState([])

  useEffect(() => {
    setCart(getCart())
  }, [])

  const getKey = (item) => item.cartKey || item.id

  const updateCart = (newCart) => {
    setCart(newCart)    // Cập nhật lại giao diện
    saveCart(newCart)   // Lưu vào localStorage
  }

  const changeQuantity = (cartKey, value) => {
    const newCart = cart.map((item) => {
      // Nếu sản phẩm ko phải sản phẩm cần sửa thì giữ nguyên
      if (getKey(item) !== cartKey) return item

      const newQuantity = item.cartQuantity + value

      // Nếu số lượng mới < 1 thì giữ nguyên
      if (newQuantity < 1) return item

      if (newQuantity > item.quantity) {
        showToast('Số lượng mua không được vượt quá tồn kho', 'warning')
        return item
      }

      return { ...item, cartQuantity: newQuantity }
    })

    updateCart(newCart)
  }

  const removeItem = (cartKey) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này không?')) return

    updateCart(cart.filter((item) => getKey(item) !== cartKey))
    showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info')
  }

  const clearCart = () => {
    if (!window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng không?')) return

    updateCart([])
    showToast('Đã xóa toàn bộ giỏ hàng', 'info')
  }

  const totalPrice = cart.reduce((sum, item) => {
    return sum + item.price * item.cartQuantity
  }, 0)

  const totalOldPrice = cart.reduce((sum, item) => {
    return sum + (item.oldPrice || item.price) * item.cartQuantity
  }, 0)

  const totalDiscount = totalOldPrice - totalPrice

  if (cart.length === 0) {
    return (
      <main className="main">
        <div className="container">
          <div className="product-not-found">
            <h2>Giỏ hàng</h2>
            <p>Giỏ hàng của bạn đang trống.</p>

            <Link to="/products" className="back-home-btn">
              Tiếp tục mua hàng
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center col-lg-8 px-0">
          <h2 className="mb-4">Giỏ hàng của bạn</h2>

          <button
            className="btn btn-outline-danger clear-cart-btn"
            onClick={clearCart}
          >
            Xóa toàn bộ giỏ hàng
          </button>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {cart.map((item) => {
              const cartKey = getKey(item)
              const oldPrice = item.oldPrice || item.price
              const discount = oldPrice - item.price

              return (
                <div className="card mb-3 shadow-sm" key={cartKey}>
                  <div className="card-body">
                    <div className="row align-items-center">
                      <div className="col-md-2 text-center">
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: 110, height: 110 }}
                        />
                      </div>

                      <div className="col-md-5">
                        <h5>{item.name}</h5>
                        <p className="text-muted mb-1">Hãng: {item.brand}</p>
                        <p className="mb-1">
                          <strong>RAM:</strong> {item.ram || 'Đang cập nhật'} |{' '}
                          <strong>Bộ nhớ:</strong> {item.storage || item.rom || 'Đang cập nhật'}
                        </p>

                        {item.color && (
                          <p className="mb-1">
                            <strong>Màu:</strong> {item.color}
                          </p>
                        )}

                        <p className="mb-0">
                          <strong>Tồn kho:</strong> {item.quantity}
                        </p>
                      </div>

                      <div className="col-md-2 text-center">
                        <p className="text-danger fw-bold mb-1">
                          {formatPrice(item.price)}
                        </p>

                        {discount > 0 && (
                          <p className="text-muted text-decoration-line-through mb-0">
                            {formatPrice(oldPrice)}
                          </p>
                        )}
                      </div>

                      <div className="col-md-2 text-center">
                        <div className="d-flex justify-content-center align-items-center">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => changeQuantity(cartKey, -1)}
                          >
                            -
                          </button>

                          <span className="mx-3 fw-bold">
                            {item.cartQuantity}
                          </span>

                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => changeQuantity(cartKey, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="col-md-1 text-center">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(cartKey)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <div className="text-end mt-3">
                      <strong>
                        Thành tiền:{' '}
                        <span className="text-danger">
                          {formatPrice(item.price * item.cartQuantity)}
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header fw-bold">Tóm tắt đơn hàng</div>

              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span>Tạm tính</span>
                  <strong>{formatPrice(totalOldPrice)}</strong>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span>Giảm giá</span>
                  <strong className="text-success">
                    -{formatPrice(totalDiscount)}
                  </strong>
                </div>

                <hr />

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="fw-bold">Tổng tiền</span>
                  <strong className="text-danger fs-3">
                    {formatPrice(totalPrice)}
                  </strong>
                </div>

                <Link to="/checkout" className="btn btn-success w-100">
                  Tiến hành thanh toán
                </Link>

                <Link to="/products" className="btn btn-outline-primary w-100 mt-2">
                  Tiếp tục mua hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Cart