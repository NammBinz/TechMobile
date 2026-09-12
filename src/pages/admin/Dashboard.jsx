import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

import api from '../../services/api'
import AdminLayout from '../../components/AdminLayout'
import { formatPrice } from '../../utils/formatPrice'

function Dashboard() {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])

  useEffect(() => {
    getData()
  }, [])

  const getData = async () => {
    try {
      const productRes = await api.get('/products')
      const userRes = await api.get('/users')
      const orderRes = await api.get('/orders')

      setProducts(productRes.data)
      setUsers(userRes.data)
      setOrders(orderRes.data)
    } catch (error) {
      console.log(error)
    }
  }

  const parseDate = (dateString) => {
    if (!dateString) return null

    const parts = dateString.split('/')

    if (parts.length !== 3) return null

    const day = Number(parts[0])
    const month = Number(parts[1])
    const year = Number(parts[2])

    return {
      day,
      month,
      year
    }
  }

  const getStatusText = (status) => {
    if (status === 'pending') return 'Chờ xác nhận'
    if (status === 'confirmed') return 'Đã xác nhận'
    if (status === 'shipping') return 'Đang giao hàng'
    if (status === 'delivered') return 'Đã giao hàng'
    if (status === 'completed') return 'Hoàn thành'
    if (status === 'cancelled') return 'Đã hủy'

    return status
  }

  const getStatusBadge = (status) => {
    if (status === 'pending') return 'badge bg-warning text-dark'
    if (status === 'confirmed') return 'badge bg-primary'
    if (status === 'shipping') return 'badge bg-info text-dark'
    if (status === 'delivered') return 'badge bg-secondary'
    if (status === 'completed') return 'badge bg-success'
    if (status === 'cancelled') return 'badge bg-danger'

    return 'badge bg-secondary'
  }

  const totalRevenue = orders
    .filter((order) => order.status === 'completed')
    .reduce((total, order) => total + Number(order.totalPrice || 0), 0)

  const pendingOrders = orders.filter((order) => order.status === 'pending')
  const confirmedOrders = orders.filter((order) => order.status === 'confirmed')
  const shippingOrders = orders.filter((order) => order.status === 'shipping')
  const deliveredOrders = orders.filter((order) => order.status === 'delivered')
  const completedOrders = orders.filter((order) => order.status === 'completed')
  const cancelledOrders = orders.filter((order) => order.status === 'cancelled')

  const customers = users.filter((user) => user.role === 'customer')
  const staffs = users.filter((user) => user.role === 'staff')
  const admins = users.filter((user) => user.role === 'admin')

  const outOfStockProducts = products.filter((product) => {
    return Number(product.quantity) <= 0
  })

  const lowStockProducts = products.filter((product) => {
    return Number(product.quantity) > 0 && Number(product.quantity) <= 5
  })

  const latestOrders = [...orders].reverse().slice(0, 5)

  const getMonthlyRevenueData = () => {
    const months = [
      { month: 'T1', revenue: 0 },
      { month: 'T2', revenue: 0 },
      { month: 'T3', revenue: 0 },
      { month: 'T4', revenue: 0 },
      { month: 'T5', revenue: 0 },
      { month: 'T6', revenue: 0 },
      { month: 'T7', revenue: 0 },
      { month: 'T8', revenue: 0 },
      { month: 'T9', revenue: 0 },
      { month: 'T10', revenue: 0 },
      { month: 'T11', revenue: 0 },
      { month: 'T12', revenue: 0 }
    ]

    orders.forEach((order) => {
      if (order.status !== 'completed') return

      const date = parseDate(order.createdAt)

      if (!date) return

      const monthIndex = date.month - 1

      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex].revenue += Number(order.totalPrice || 0)
      }
    })

    return months
  }

  const orderStatusChartData = [
    {
      name: 'Chờ xác nhận',
      value: pendingOrders.length
    },
    {
      name: 'Đã xác nhận',
      value: confirmedOrders.length
    },
    {
      name: 'Đang giao',
      value: shippingOrders.length
    },
    {
      name: 'Đã giao hàng',
      value: deliveredOrders.length
    },
    {
      name: 'Hoàn thành',
      value: completedOrders.length
    },
    {
      name: 'Đã hủy',
      value: cancelledOrders.length
    }
  ]

  const pieColors = [
    '#F59E0B',
    '#2563EB',
    '#06B6D4',
    '#64748B',
    '#10B981',
    '#DC2626'
  ]

  const getMonthFromDate = (dateValue) => {
    if (!dateValue) return 'Không rõ'

    if (dateValue.includes('/')) {
      const parts = dateValue.split('/')
      const month = parts[1]
      const year = parts[2]

      return `${month}/${year}`
    }

    const date = new Date(dateValue)

    if (isNaN(date.getTime())) return 'Không rõ'

    return `${date.getMonth() + 1}/${date.getFullYear()}`
  }

  const exportRevenueExcel = () => {
    const completedOrders = orders.filter((order) => {
      return order.status === 'completed'
    })

    if (completedOrders.length === 0) {
      alert('Chưa có đơn hàng hoàn thành để xuất doanh thu')
      return
    }

    const revenueByMonth = {}

    completedOrders.forEach((order) => {
      const monthKey = getMonthFromDate(order.createdAt)

      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = {
          totalRevenue: 0,
          totalOrders: 0
        }
      }

      revenueByMonth[monthKey].totalRevenue += Number(order.totalPrice || 0)
      revenueByMonth[monthKey].totalOrders += 1
    })

    const rows = []

    rows.push(['BÁO CÁO DOANH THU TECHMOBILE'])
    rows.push(['Ngày xuất báo cáo', new Date().toLocaleDateString('vi-VN')])
    rows.push([])
    rows.push(['I. TỔNG HỢP DOANH THU THEO THÁNG'])
    rows.push(['Tháng', 'Số đơn hoàn thành', 'Doanh thu'])

    Object.keys(revenueByMonth).forEach((month) => {
      rows.push([
        month,
        revenueByMonth[month].totalOrders,
        revenueByMonth[month].totalRevenue
      ])
    })

    rows.push([])
    rows.push(['II. CHI TIẾT ĐƠN HÀNG HOÀN THÀNH'])
    rows.push([
      'Mã đơn',
      'Ngày đặt',
      'Khách hàng',
      'Người nhận',
      'Số điện thoại',
      'Địa chỉ',
      'Phương thức thanh toán',
      'Trạng thái thanh toán',
      'Tổng tiền'
    ])

    completedOrders.forEach((order) => {
      rows.push([
        order.id,
        order.createdAt,
        order.customerName || '',
        order.receiverName || '',
        order.phone || '',
        order.address || '',
        order.paymentMethod || '',
        order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        Number(order.totalPrice || 0)
      ])
    })

    const csvContent = rows
      .map((row) => {
        return row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(';')
      })
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `bao-cao-doanh-thu-techmobile-${Date.now()}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Tổng quan quản trị</h2>

        <button
          className="btn btn-success"
          onClick={exportRevenueExcel}
        >
          Xuất doanh thu Excel
        </button>
      </div>

      <div className="row">
        <div className="col-md-3 mb-3">
          <div className="card admin-stat-card stat-blue">
            <div className="card-body">
              <p className="stat-label">Tổng sản phẩm</p>
              <h3>{products.length}</h3>
              <span>Điện thoại đang quản lý</span>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card admin-stat-card stat-green">
            <div className="card-body">
              <p className="stat-label">Tổng tài khoản</p>
              <h3>{users.length}</h3>
              <span>Khách hàng, nhân viên, admin</span>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card admin-stat-card stat-orange">
            <div className="card-body">
              <p className="stat-label">Tổng đơn hàng</p>
              <h3>{orders.length}</h3>
              <span>Tất cả đơn đã tạo</span>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card admin-stat-card stat-red">
            <div className="card-body">
              <p className="stat-label">Doanh thu</p>
              <h3>{formatPrice(totalRevenue)}</h3>
              <span>Chỉ tính đơn hoàn thành</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-2">
        <div className="col-lg-8 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Biểu đồ doanh thu theo tháng
            </div>

            <div className="card-body">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={getMonthlyRevenueData()}>
                    <XAxis dataKey="month" />

                    <YAxis
                      tickFormatter={(value) => {
                        return `${Math.round(value / 1000000)}tr`
                      }}
                    />

                    <Tooltip
                      formatter={(value) => formatPrice(value)}
                      labelFormatter={(label) => `Tháng ${label.replace('T', '')}`}
                    />

                    <Bar
                      dataKey="revenue"
                      fill="#D70018"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Tỷ lệ trạng thái đơn hàng
            </div>

            <div className="card-body">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={orderStatusChartData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={95}
                      label
                    >
                      {orderStatusChartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-2">
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Thống kê trạng thái đơn hàng
            </div>

            <div className="card-body">
              <div className="dashboard-status-row">
                <span>Chờ xác nhận</span>
                <strong className="text-warning">{pendingOrders.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Đã xác nhận</span>
                <strong className="text-primary">{confirmedOrders.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Đang giao hàng</span>
                <strong className="text-info">{shippingOrders.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Đã giao hàng</span>
                <strong className="text-secondary">{deliveredOrders.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Hoàn thành</span>
                <strong className="text-success">{completedOrders.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Đã hủy</span>
                <strong className="text-danger">{cancelledOrders.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Thống kê tài khoản và tồn kho
            </div>

            <div className="card-body">
              <div className="dashboard-status-row">
                <span>Khách hàng</span>
                <strong>{customers.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Nhân viên</span>
                <strong>{staffs.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Quản trị viên</span>
                <strong>{admins.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Sản phẩm sắp hết hàng</span>
                <strong className="text-warning">{lowStockProducts.length}</strong>
              </div>

              <div className="dashboard-status-row">
                <span>Sản phẩm hết hàng</span>
                <strong className="text-danger">{outOfStockProducts.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Đơn hàng gần đây
            </div>

            <div className="card-body">
              {latestOrders.length === 0 ? (
                <p className="text-muted">Chưa có đơn hàng nào.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Ngày đặt</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>

                    <tbody>
                      {latestOrders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>

                          <td>{order.customerName}</td>

                          <td>{order.createdAt}</td>

                          <td className="text-danger fw-bold">
                            {formatPrice(order.totalPrice)}
                          </td>

                          <td>
                            <span className={getStatusBadge(order.status)}>
                              {getStatusText(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-header fw-bold">
              Sản phẩm cần chú ý
            </div>

            <div className="card-body">
              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                <p className="text-muted">Không có sản phẩm sắp hết hoặc hết hàng.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center">
                    <thead>
                      <tr>
                        <th>Ảnh</th>
                        <th>Sản phẩm</th>
                        <th>Tồn kho</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...outOfStockProducts, ...lowStockProducts].map((product) => (
                        <tr key={product.id}>
                          <td>
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{
                                width: '55px',
                                height: '55px',
                                objectFit: 'contain'
                              }}
                            />
                          </td>

                          <td>{product.name}</td>

                          <td>
                            <span
                              className={
                                Number(product.quantity) <= 0
                                  ? 'badge bg-danger'
                                  : 'badge bg-warning text-dark'
                              }
                            >
                              {product.quantity}
                            </span>
                          </td>

                          <td>
                            {Number(product.quantity) <= 0 ? (
                              <span className="badge bg-danger">
                                Hết hàng
                              </span>
                            ) : (
                              <span className="badge bg-warning text-dark">
                                Sắp hết
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Dashboard