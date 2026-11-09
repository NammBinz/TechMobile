import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import api from '../../services/api'
import { messageOf } from '../../services/operations'
import { formatPrice } from '../../utils/formatPrice'
import { getCurrentUser } from '../../utils/auth'

const labels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao', completed: 'Hoàn thành', cancelled: 'Đã hủy' }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const csvCell = value => {
  let text = value == null ? '' : String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
function Dashboard() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const [dates, setDates] = useState({ from: '', to: '' }), [query, setQuery] = useState({ from: '', to: '' })
  const isAdmin = getCurrentUser()?.role === 'admin'
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData((await api.get('/reports/dashboard', { params: query })).data) }
    catch (e) { setError(messageOf(e)) }
    finally { setLoading(false) }
  }, [query])
  useEffect(() => { Promise.resolve().then(load) }, [load])
  const preset = kind => {
    const date = today(), year = date.slice(0, 4)
    const range = kind === 'today' ? { from: date, to: date } : kind === 'month' ? { from: date.slice(0, 7) + '-01', to: date } : kind === 'year' ? { from: year + '-01-01', to: year + '-12-31' } : { from: '', to: '' }
    setDates(range); setQuery(range)
  }
  const exportCsv = () => {
    const rows = [['BÁO CÁO TECHMOBILE', data.from || 'Tất cả', data.to || 'Tất cả'], ['Đơn hoàn thành theo ngày hoàn thành'], ['Mã đơn', 'Ngày', 'Doanh thu', ...(isAdmin ? ['Giá vốn đã biết', 'Máy thiếu giá vốn', 'Lợi nhuận gộp', 'Máy có vốn mô phỏng'] : [])], ...data.rows.map(r => [r.orderId, r.date, r.revenue, ...(isAdmin ? [r.costTotal, r.missingCostDevices, r.grossProfit ?? 'Chưa đủ giá vốn', r.simulatedCostDevices || 0] : [])]), [], ['Đơn hoàn thành thiếu ngày - không cộng vào kỳ'], ...data.unknownDates.map(r => [r.orderId, 'Chưa xác định', r.revenue]), [], ['Ghi nhận thanh toán - không thay thế đối soát ngân hàng'], ['Mã đơn', 'Ngày', 'Số tiền điều chỉnh', 'Nguồn demo', 'Nguồn'], ...data.payments.map(r => [r.orderId, r.date, r.amount, r.demo ? 'Có' : 'Không', r.source]), [], ['Thanh toán thiếu ngày - không cộng vào kỳ'], ...data.unknownPayments.map(r => [r.orderId, 'Chưa xác định', r.amount])]
    const blob = new Blob(['\uFEFF' + rows.map(r => r.map(csvCell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob), anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'techmobile-report.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <AdminLayout><h2>Dashboard và báo cáo</h2>
    <form className="card p-3 my-3" onSubmit={e => { e.preventDefault(); setQuery({ ...dates }) }}>
      <div className="d-flex flex-wrap gap-2 mb-3">{[['all', 'Tất cả'], ['today', 'Hôm nay'], ['month', 'Tháng này'], ['year', 'Năm nay']].map(([key, label]) => <button type="button" className="btn btn-outline-secondary btn-sm" key={key} onClick={() => preset(key)}>{label}</button>)}</div>
      <div className="row g-3"><div className="col-sm-4"><label htmlFor="report-from">Từ ngày</label><input id="report-from" type="date" className="form-control" value={dates.from} onChange={e => setDates({ ...dates, from: e.target.value })} /></div><div className="col-sm-4"><label htmlFor="report-to">Đến ngày</label><input id="report-to" type="date" min={dates.from || undefined} className="form-control" value={dates.to} onChange={e => setDates({ ...dates, to: e.target.value })} /></div><div className="col-sm-4"><label htmlFor="report-year">Chọn năm</label><select id="report-year" className="form-select" value="" onChange={e => { if (e.target.value) { const range = { from: e.target.value + '-01-01', to: e.target.value + '-12-31' }; setDates(range); setQuery(range) } }}><option value="">Chọn một năm</option>{[...new Set([today().slice(0, 4), ...(data?.years || [])])].sort().reverse().map(y => <option key={y}>{y}</option>)}</select></div></div>
      <div className="admin-form-actions"><button disabled={loading} className="btn btn-primary">Áp dụng bộ lọc</button><button type="button" className="btn btn-outline-success" disabled={!data || loading || !!error} onClick={exportCsv}>Xuất báo cáo CSV</button></div>
    </form>
    {error && <div role="alert" className="alert alert-danger">{error} <button onClick={load} className="btn btn-sm btn-outline-danger">Thử lại</button></div>}
    {loading && <p role="status">Đang tải báo cáo…</p>}
    {data && !loading && !error && <>
      <p className="text-muted">Kỳ báo cáo: {data.from || 'Từ trước đến nay'} → {data.to || 'hiện tại'}. Doanh thu theo ngày hoàn thành; thanh toán theo ngày ghi nhận, không đồng nghĩa đã đối soát tiền thực thu.</p>
      {isAdmin && data.totals.simulatedCostDevices > 0 && <p className="alert alert-warning">Có {data.totals.simulatedCostDevices} máy trong kỳ dùng giá vốn mô phỏng. Lợi nhuận gộp là ước tính theo dữ liệu demo.</p>}
      <div className="row g-3 mb-3">{[['Doanh thu bán hàng', formatPrice(data.totals.revenue)], ['Thanh toán đã ghi nhận (không gồm demo)', formatPrice(data.totals.paymentRecorded)], ['Điều chỉnh thanh toán demo', formatPrice(data.totals.demoPaymentRecorded)], ...(isAdmin ? [['Giá vốn đã biết', formatPrice(data.totals.costTotal)], ['Lợi nhuận gộp', data.totals.grossProfit == null ? 'Chưa đủ giá vốn' : formatPrice(data.totals.grossProfit)], ['Máy / đơn thiếu giá vốn', `${data.totals.missingCostDevices} / ${data.totals.missingCostOrders}`]] : [])].map(([label, value]) => <div className="col-sm-6 col-xl-4" key={label}><div className="card p-3 h-100"><small>{label}</small><strong className="fs-5">{value}</strong></div></div>)}</div>
      <div className="row g-3 mb-3"><div className="col-lg-7"><div className="card p-3"><h5>Doanh thu theo tháng/năm</h5><div style={{ width: '100%', height: 260 }}><ResponsiveContainer><BarChart data={data.monthly}><XAxis dataKey="month" /><YAxis width={75} tickFormatter={value => Math.abs(value) >= 1000000 ? `${value / 1000000} tr` : value} /><Tooltip formatter={value => formatPrice(value)} /><Bar dataKey="revenue" fill="#dc3545" /></BarChart></ResponsiveContainer></div>{!data.monthly.length && <p>Chưa có doanh thu trong kỳ.</p>}</div></div><div className="col-lg-5"><div className="card p-3"><h5>Trạng thái đơn hiện tại (toàn bộ)</h5><div style={{ width: '100%', height: 260 }}><ResponsiveContainer><PieChart><Pie data={Object.entries(data.current.states).map(([key, value]) => ({ name: labels[key] || key, value }))} dataKey="value" nameKey="name" outerRadius={85} label>{Object.keys(data.current.states).map((s, i) => <Cell key={s} fill={['#ffc107', '#0d6efd', '#20c997', '#6f42c1', '#198754', '#dc3545'][i % 6]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div></div></div>
      <div className="card p-3 mb-3"><h5>Kho và bảo hành hiện tại (không áp dụng bộ lọc ngày)</h5><div className="d-flex gap-3 flex-wrap"><span>Đã phân bổ (chờ giao): {data.current.devices.allocated || 0}</span><span>Đang giao: {data.current.devices.shipping || 0}</span><span>Đã bán: {data.current.devices.sold || 0}</span><span>Chờ nhận lại: {data.current.devices.return_pending || 0}</span><span>Chờ kiểm tra: {data.current.devices.quarantine || 0}</span><span>Phiếu bảo hành đang mở: {data.current.openClaims}</span></div><details className="mt-2"><summary>Phiên bản tồn thấp / hết hàng ({data.current.lowStock.length})</summary>{data.current.lowStock.map(v => <p key={JSON.stringify([v.productId, v.variantId])}>{v.name} · {v.ram} / {v.storage} · {v.color}: {v.quantity}</p>)}</details></div>
      <div className="card p-3 mb-3"><h5>Đơn hoàn thành trong kỳ ({data.rows.length})</h5><div className="table-responsive"><table className="table"><thead><tr><th>Mã đơn</th><th>Ngày hoàn thành</th><th>Doanh thu</th>{isAdmin && <><th>Giá vốn đã biết</th><th>Lợi nhuận gộp</th></>}</tr></thead><tbody>{data.rows.map(r => <tr key={r.orderId}><td><Link to={'/admin/orders?order=' + encodeURIComponent(r.orderId)}>{r.orderId}</Link></td><td>{r.date}</td><td>{formatPrice(r.revenue)}</td>{isAdmin && <><td>{formatPrice(r.costTotal)}{r.missingCostDevices > 0 && <small className="d-block text-warning">Thiếu {r.missingCostDevices} máy</small>}</td><td>{r.grossProfit == null ? 'Chưa đủ giá vốn' : formatPrice(r.grossProfit)}</td></>}</tr>)}</tbody></table></div></div>
      <details className="card p-3 mb-3"><summary>Ghi nhận thanh toán trong kỳ ({data.payments.length})</summary><p className="text-muted">Số âm là điều chỉnh giảm ghi nhận, không tự xác nhận hoàn tiền thực tế.</p><div className="table-responsive"><table className="table"><thead><tr><th>Mã đơn</th><th>Ngày ghi nhận</th><th>Số tiền điều chỉnh</th><th>Nguồn</th></tr></thead><tbody>{data.payments.map((r, i) => <tr key={i}><td>{r.orderId}</td><td>{r.date}</td><td>{formatPrice(r.amount)}</td><td>{r.demo ? 'Điều chỉnh demo' : 'Ghi nhận thanh toán'}</td></tr>)}</tbody></table></div></details>
      <div className="card p-3 mb-3"><h5>Phiên bản bán chạy trong kỳ</h5>{data.topVariants.slice(0, 10).map(v => <p key={JSON.stringify([v.productId, v.variantId])}>{v.name} · {v.ram} / {v.storage} · {v.color}: <strong>{v.quantity} máy</strong></p>)}</div>
      <div className="card p-3 mb-3"><h5>Cần đối chiếu mốc thời gian</h5><p>{data.unknownDates.length} đơn hoàn thành và {data.unknownPayments.length} ghi nhận thanh toán thiếu ngày, chưa cộng vào kỳ. Không dùng ngày tạo đơn thay thế.</p>{data.unknownDates.map(r => <p key={r.orderId}>Đơn #{r.orderId}: {formatPrice(r.revenue)} · chưa xác định ngày hoàn thành</p>)}</div>
      <div className="card p-3"><h5>Đơn gần đây (toàn bộ)</h5>{data.latestOrders.map(o => <p key={o.id}><Link to={'/admin/orders?order=' + encodeURIComponent(o.id)}>#{o.id}</Link> · {labels[o.status]} · {formatPrice(o.totalPrice)}</p>)}</div>
    </>}
  </AdminLayout>
}
export default Dashboard
