import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../utils/formatPrice'

function Compare() {
  const [compareList, setCompareList] = useState([])

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('compareList')) || []
    setCompareList(data)
  }, [])

  const getSpecs = (product) => {
    return {
      screen: product.screen || 'Đang cập nhật',
      chip: product.chip || 'Đang cập nhật',
      ram: product.ram || 'Đang cập nhật',
      rom: product.rom || product.storage || 'Đang cập nhật',
      camera: product.camera || 'Đang cập nhật',
      battery: product.battery || 'Đang cập nhật',
      charge: product.charge || 'Đang cập nhật',

      memory: product.memory || {
        ram: product.ram || 'Đang cập nhật',
        storage: product.storage || 'Đang cập nhật',
        card: 'Đang cập nhật'
      },

      displayCamera: product.displayCamera || {
        display: product.screen || 'Đang cập nhật',
        rearCamera: product.camera || 'Đang cập nhật',
        frontCamera: 'Đang cập nhật'
      },

      batteryCharge: product.batteryCharge || {
        battery: product.battery || 'Đang cập nhật',
        charge: product.charge || 'Đang cập nhật',
        wireless: 'Đang cập nhật'
      },

      utilities: product.utilities || {
        security: 'Đang cập nhật',
        waterResistant: 'Đang cập nhật',
        special: 'Đang cập nhật'
      },

      connection: product.connection || {
        sim: 'Đang cập nhật',
        network: '5G',
        port: 'USB-C'
      },

      design: product.design || {
        material: 'Đang cập nhật',
        weight: 'Đang cập nhật',
        color: 'Đang cập nhật'
      }
    }
  }

  const saveCompareList = (newList) => {
    setCompareList(newList)
    localStorage.setItem('compareList', JSON.stringify(newList))
  }

  const handleRemove = (id) => {
    const newList = compareList.filter((product) => product.id !== id)
    saveCompareList(newList)
  }

  const handleClear = () => {
    const confirmClear = window.confirm('Bạn có chắc muốn xóa toàn bộ danh sách so sánh không?')

    if (!confirmClear) return

    setCompareList([])
    localStorage.removeItem('compareList')
  }

  const handleAddCart = (product) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || []

    const index = cart.findIndex((item) => item.id === product.id)

    if (index !== -1) {
      cart[index].cartQuantity += 1
    } else {
      cart.push({
        ...product,
        cartQuantity: 1
      })
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cartUpdated'))
    alert('Đã thêm vào giỏ hàng')
  }

  const renderCompareTable = (title, rows) => {
    return (
      <section className="compare-section">
        <h3>{title}</h3>

        <div className={`compare-table compare-count-${compareList.length}`}>
          <div className="compare-row compare-row-head">
            <div className="compare-cell compare-label">Thông số</div>

            {compareList.map((product) => (
              <div className="compare-cell" key={product.id}>
                {product.name}
              </div>
            ))}
          </div>

          {rows.map((row, index) => (
            <div className="compare-row" key={index}>
              <div className="compare-cell compare-label">
                {row.label}
              </div>

              {compareList.map((product) => (
                <div className="compare-cell" key={product.id}>
                  {row.value(product)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (compareList.length === 0) {
    return (
      <main className="main">
        <div className="container">
          <div className="empty-compare-page">
            <h2>So sánh sản phẩm</h2>
            <p>Bạn chưa chọn sản phẩm nào để so sánh.</p>

            <Link to="/products" className="empty-action-btn">
              Chọn sản phẩm để so sánh
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="mb-1">So sánh điện thoại</h2>
            <p className="text-muted mb-0">
              Đang so sánh {compareList.length} sản phẩm
            </p>
          </div>

          <div>
            <Link to="/products" className="btn btn-primary me-2">
              Thêm sản phẩm
            </Link>

            <button className="btn btn-danger" onClick={handleClear}>
              Xóa tất cả
            </button>
          </div>
        </div>

        {compareList.length < 2 && (
          <div className="alert alert-warning">
            Bạn nên chọn ít nhất 2 sản phẩm để so sánh rõ hơn.
          </div>
        )}

        <section className={`compare-product-header compare-count-${compareList.length}`}>
          {compareList.map((product) => (
            <div className="compare-product-main" key={product.id}>
              <img src={product.image} alt={product.name} />

              <h3>{product.name}</h3>

              <p>{product.brand}</p>

              <strong>{formatPrice(product.price)}</strong>

              {product.oldPrice > product.price && (
                <p className="text-decoration-line-through text-muted">
                  {formatPrice(product.oldPrice)}
                </p>
              )}

              <div className="mt-3 d-flex justify-content-center gap-2">
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => handleAddCart(product)}
                >
                  Mua ngay
                </button>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleRemove(product.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </section>

        {renderCompareTable('So sánh tổng quát nhanh', [
          {
            label: 'Giá bán',
            value: (product) => formatPrice(product.price)
          },
          {
            label: 'Hãng',
            value: (product) => product.brand
          },
          {
            label: 'Màn hình',
            value: (product) => getSpecs(product).screen
          },
          {
            label: 'Chip',
            value: (product) => getSpecs(product).chip
          },
          {
            label: 'RAM',
            value: (product) => getSpecs(product).ram
          },
          {
            label: 'Bộ nhớ',
            value: (product) => getSpecs(product).rom
          },
          {
            label: 'Camera',
            value: (product) => getSpecs(product).camera
          },
          {
            label: 'Pin',
            value: (product) => getSpecs(product).battery
          },
          {
            label: 'Sạc',
            value: (product) => getSpecs(product).charge
          }
        ])}

        {renderCompareTable('Cấu hình bộ nhớ', [
          {
            label: 'RAM',
            value: (product) => getSpecs(product).memory.ram
          },
          {
            label: 'Bộ nhớ trong',
            value: (product) => getSpecs(product).memory.storage
          },
          {
            label: 'Thẻ nhớ',
            value: (product) => getSpecs(product).memory.card
          }
        ])}

        {renderCompareTable('Camera, màn hình', [
          {
            label: 'Màn hình',
            value: (product) => getSpecs(product).displayCamera.display
          },
          {
            label: 'Camera sau',
            value: (product) => getSpecs(product).displayCamera.rearCamera
          },
          {
            label: 'Camera trước',
            value: (product) => getSpecs(product).displayCamera.frontCamera
          }
        ])}

        {renderCompareTable('Pin, sạc', [
          {
            label: 'Dung lượng pin',
            value: (product) => getSpecs(product).batteryCharge.battery
          },
          {
            label: 'Sạc nhanh',
            value: (product) => getSpecs(product).batteryCharge.charge
          },
          {
            label: 'Sạc không dây',
            value: (product) => getSpecs(product).batteryCharge.wireless
          }
        ])}

        {renderCompareTable('Tiện ích', [
          {
            label: 'Bảo mật',
            value: (product) => getSpecs(product).utilities.security
          },
          {
            label: 'Kháng nước',
            value: (product) => getSpecs(product).utilities.waterResistant
          },
          {
            label: 'Tính năng đặc biệt',
            value: (product) => getSpecs(product).utilities.special
          }
        ])}

        {renderCompareTable('Kết nối', [
          {
            label: 'SIM',
            value: (product) => getSpecs(product).connection.sim
          },
          {
            label: 'Mạng di động',
            value: (product) => getSpecs(product).connection.network
          },
          {
            label: 'Cổng sạc',
            value: (product) => getSpecs(product).connection.port
          }
        ])}

        {renderCompareTable('Thiết kế, vật liệu', [
          {
            label: 'Vật liệu',
            value: (product) => getSpecs(product).design.material
          },
          {
            label: 'Trọng lượng',
            value: (product) => getSpecs(product).design.weight
          },
          {
            label: 'Màu sắc',
            value: (product) => getSpecs(product).design.color
          }
        ])}
      </div>
    </main>
  )
}

export default Compare