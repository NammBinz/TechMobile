import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatPrice } from '../utils/formatPrice'
import {
    getCart,
    getCompareList,
    removeFromCart,
    removeCompareProduct,
    showToast
} from '../utils/shopActions'

function FloatingPanels() {
    const [cart, setCart] = useState([])
    const [compareList, setCompareList] = useState([])
    const [toasts, setToasts] = useState([])
    const [isCompareOpen, setIsCompareOpen] = useState(false)

    const modalContentRef = useRef(null)

    const location = useLocation()

    const hidePanelsPaths = ['/cart', '/checkout', '/orders']

    const shouldHidePanels =
        hidePanelsPaths.includes(location.pathname) ||
        location.pathname.startsWith('/admin')

    const loadData = () => {
        setCart(getCart())
        setCompareList(getCompareList())
    }

    const handleShowToast = (event) => {
        const newToast = {
            id: Date.now(),
            message: event.detail.message,
            type: event.detail.type || 'success'
        }

        setToasts((prev) => [...prev, newToast])

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== newToast.id))
        }, 1000)
    }

    useEffect(() => {
        loadData()

        window.addEventListener('cartUpdated', loadData)
        window.addEventListener('compareUpdated', loadData)
        window.addEventListener('storage', loadData)
        window.addEventListener('showToast', handleShowToast)

        return () => {
            window.removeEventListener('cartUpdated', loadData)
            window.removeEventListener('compareUpdated', loadData)
            window.removeEventListener('storage', loadData)
            window.removeEventListener('showToast', handleShowToast)
        }
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
                network: 'Đang cập nhật',
                port: 'Đang cập nhật'
            },

            design: product.design || {
                material: 'Đang cập nhật',
                weight: 'Đang cập nhật',
                color: 'Đang cập nhật'
            }
        }
    }

    const totalQuantity = cart.reduce((sum, item) => {
        return sum + item.cartQuantity
    }, 0)

    const totalPrice = cart.reduce((sum, item) => {
        return sum + item.price * item.cartQuantity
    }, 0)

    const totalSaving = cart.reduce((sum, item) => {
        const oldPrice = item.oldPrice || item.msrp || item.price
        const discount = oldPrice > item.price ? oldPrice - item.price : 0

        return sum + discount * item.cartQuantity
    }, 0)

    const openCompareModal = () => {
        if (compareList.length < 2) {
            showToast('Bạn cần chọn ít nhất 2 sản phẩm để so sánh', 'warning')
            return
        }

        // Mở modal
        setIsCompareOpen(true)
        // Thêm class vào body > khóa cuộn nền khi modal mở
        document.body.classList.add('modal-open')
    }

    const closeCompareModal = () => {
        setIsCompareOpen(false)
        document.body.classList.remove('modal-open')
    }

    // Khi click ngoài modal thì đóng modal
    const handleOverlayClick = (event) => {
        if (event.target.classList.contains('compare-modal-overlay'))
            closeCompareModal()
    }

    const setupCompareSideNavClick = (targetId) => {
        const target = document.getElementById(targetId)

        if (!target || !modalContentRef.current) return

        modalContentRef.current.scrollTo({
            top: target.offsetTop - 20,
            behavior: 'smooth'
        })
    }

    const renderCompareTable = (title, sectionId, rows) => {
        return (
            <section className="compare-section" id={sectionId}>
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

    return (
        <>
            <div className="toast-container" id="toastContainer">
                {toasts.map((toast) => (
                    <div className={`toast toast-${toast.type}`} key={toast.id}>
                        {toast.message}
                    </div>
                ))}
            </div>
            
            {/* Hiển thị panel */}
            {!shouldHidePanels && (
                <aside className="right-floating-panels">
                    <div
                        className={cart.length > 0 ? 'mini-panel cart-mini-panel active' : 'mini-panel cart-mini-panel'}
                        id="cartMiniPanel"
                    >
                        <div className="mini-panel-header">
                            <h3>Giỏ hàng</h3>
                            <span>{totalQuantity}</span>
                        </div>

                        <div className="mini-panel-list">
                            {cart.length === 0 ? (
                                <p className="mini-empty">Giỏ hàng đang trống.</p>
                            ) : (
                                <>
                                    <div className="mini-product-scroll">
                                        {cart.map((item) => {
                                            const oldPrice = item.oldPrice || item.msrp || item.price
                                            const discount = oldPrice > item.price ? oldPrice - item.price : 0

                                            return (
                                                <div className="mini-product-item cart-mini-item" key={item.id}>
                                                    <div className="cart-left-column">
                                                        <img src={item.image} alt={item.name} />
                                                        <div className="cart-quantity-badge">
                                                            x{item.cartQuantity}
                                                        </div>
                                                    </div>

                                                    <div className="mini-product-info cart-product-info">
                                                        <h4>{item.name}</h4>

                                                        <div className="mini-price-row">
                                                            <p>{formatPrice(item.price)}</p>

                                                            {discount > 0 && (
                                                                <span className="mini-old-price">
                                                                    {formatPrice(oldPrice)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {discount > 0 && (
                                                            <small className="mini-discount">
                                                                Giảm {formatPrice(discount)}
                                                            </small>
                                                        )}
                                                    </div>

                                                    <button
                                                        className="mini-remove-btn"
                                                        onClick={() => removeFromCart(item.cartKey || item.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="mini-summary">
                                        <div>
                                            <span>Tổng tiền</span>
                                            <strong>{formatPrice(totalPrice)}</strong>
                                        </div>

                                        {totalSaving > 0 && (
                                            <div className="mini-saving">
                                                <span>Tiết kiệm</span>
                                                <strong>{formatPrice(totalSaving)}</strong>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="mini-action-btn"
                                        onClick={() => {
                                            window.location.href = '/cart'
                                        }}
                                    >
                                        Xem giỏ hàng
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div
                        className={
                            compareList.length > 0
                                ? 'mini-panel compare-mini-panel active'
                                : 'mini-panel compare-mini-panel'
                        }
                        id="compareMiniCart"
                    >
                        <div className="mini-panel-header">
                            <h3>So sánh sản phẩm</h3>
                            <span>{compareList.length}</span>
                        </div>

                        <div className="mini-panel-list">
                            {compareList.length === 0 ? (
                                <p className="mini-empty">Chưa chọn sản phẩm.</p>
                            ) : (
                                <>
                                    <div className="mini-product-scroll">
                                        {compareList.map((product) => (
                                            <div className="mini-product-item" key={product.id}>
                                                <img src={product.image} alt={product.name} />

                                                <div className="mini-product-info">
                                                    <h4>{product.name}</h4>
                                                    <p>{formatPrice(product.price)}</p>
                                                </div>

                                                <button
                                                    className="mini-remove-btn"
                                                    onClick={() => removeCompareProduct(product.id)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {compareList.length >= 2 ? (
                                        <button
                                            className="mini-action-btn compare-action"
                                            onClick={openCompareModal}
                                        >
                                            So sánh {compareList.length} sản phẩm
                                        </button>
                                    ) : (
                                        <p className="mini-note">
                                            Chọn thêm 1 sản phẩm nữa để so sánh.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </aside>
            )}

            {!shouldHidePanels && isCompareOpen && (
                <div
                    className="compare-modal-overlay active"
                    id="compareModal"
                    onClick={handleOverlayClick}
                >
                    <div className="compare-modal" id="compareModalBox">
                        <div className="compare-modal-layout">
                            <aside className="compare-side-nav" id="compareSideNav">
                                <h4>Mục so sánh</h4>

                                <button onClick={() => setupCompareSideNavClick('quickCompare')}>
                                    Tổng quát
                                </button>

                                <button onClick={() => setupCompareSideNavClick('memoryCompare')}>
                                    Cấu hình bộ nhớ
                                </button>

                                <button onClick={() => setupCompareSideNavClick('displayCameraCompare')}>
                                    Camera, màn hình
                                </button>

                                <button onClick={() => setupCompareSideNavClick('batteryCompare')}>
                                    Pin, sạc
                                </button>

                                <button onClick={() => setupCompareSideNavClick('utilityCompare')}>
                                    Tiện ích
                                </button>

                                <button onClick={() => setupCompareSideNavClick('connectCompare')}>
                                    Kết nối
                                </button>

                                <button onClick={() => setupCompareSideNavClick('designCompare')}>
                                    Thiết kế, vật liệu
                                </button>
                            </aside>

                            <div
                                className="compare-modal-content"
                                id="compareModalScroll"
                                ref={modalContentRef}
                            >
                                <h2>So sánh điện thoại</h2>

                                <div id="compareModalContent">
                                    <section className={`compare-product-header compare-count-${compareList.length}`}>
                                        {compareList.map((product) => (
                                            <div className="compare-product-main" key={product.id}>
                                                <img src={product.image} alt={product.name} />
                                                <h3>{product.name}</h3>
                                                <p>{product.brand}</p>
                                                <strong>{formatPrice(product.price)}</strong>
                                            </div>
                                        ))}
                                    </section>

                                    {renderCompareTable('So sánh tổng quát nhanh', 'quickCompare', [
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
                                            label: 'ROM',
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

                                    {renderCompareTable('Cấu hình bộ nhớ', 'memoryCompare', [
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

                                    {renderCompareTable('Camera, màn hình', 'displayCameraCompare', [
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

                                    {renderCompareTable('Pin, sạc', 'batteryCompare', [
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

                                    {renderCompareTable('Tiện ích', 'utilityCompare', [
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

                                    {renderCompareTable('Kết nối', 'connectCompare', [
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

                                    {renderCompareTable('Thiết kế, vật liệu', 'designCompare', [
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
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FloatingPanels