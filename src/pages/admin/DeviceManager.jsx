import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import AdminFormSection from '../../components/AdminFormSection'
import AdminNoteModal from '../../components/AdminNoteModal'
import api from '../../services/api'
import { messageOf, runCommand } from '../../services/operations'
import { getCurrentUser } from '../../utils/auth'
import { showToast } from '../../utils/shopActions'
import { formatDate, compareVariants } from '../../utils/variants'

const labels = { available: 'Khả dụng', allocated: 'Đã phân bổ', shipping: 'Đang giao', sold: 'Đã bán', return_pending: 'Chờ nhận lại', quarantine: 'Chờ kiểm tra', retired: 'Ngừng sử dụng' }
const badges = { available: 'success', allocated: 'primary', shipping: 'info text-dark', sold: 'secondary', return_pending: 'warning text-dark', quarantine: 'warning text-dark', retired: 'dark' }
const versionKey = (product, variant) => JSON.stringify([variant.ram || product.ram || '', variant.storage || ''])
const versionLabel = (product, variant) => [variant.ram || product.ram, variant.storage].filter(Boolean).join(' / ')
const stockKey = (productId, variantId) => JSON.stringify([String(productId), String(variantId)])
const initialFilters = { brand: '', productId: '', version: '', color: '' }

function StockNumber({ value }) {
  return <span className={`stock-number${value === 0 ? ' is-zero' : ''}`}>{value}</span>
}

function VariantDevices({ product, variant, isAdmin, refresh, onClose, onChange }) {
  const [query, setQuery] = useState({ page: 1, status: '', imei: '' })
  const [result, setResult] = useState(null), [error, setError] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [statusChange, setStatusChange] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const { data } = await api.get('/devices', { params: { productId: product.id, variantId: variant.id, ...query, limit: 20 }, signal: controller.signal })
        if (!controller.signal.aborted) {
          if (query.page > data.totalPages) setQuery(q => ({ ...q, page: data.totalPages }))
          else setResult(data)
        }
      } catch (error) { if (!controller.signal.aborted) setError(messageOf(error)) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [product.id, variant.id, query, refresh])
  const changeStatus = async reason => {
    const { device, status } = statusChange
    setBusy(true)
    try {
      await runCommand('device-status', { deviceId: device.id, expectedRevision: device.revision, status, reason })
      await onChange(); showToast('Đã cập nhật máy')
    } catch (error) { showToast(messageOf(error), 'warning'); await onChange() }
    finally { setBusy(false); setStatusChange(null) }
  }
  return <section className="card p-3 my-3 variant-device-list" aria-label="Danh sách IMEI theo phiên bản">
    <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
      <div><h4 className="mb-1">{product.name}</h4><strong>{variant.color} · {versionLabel(product, variant)}</strong></div>
      <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Đóng danh sách IMEI</button>
    </div>
    <div className="row g-2 mb-3">
      <div className="col-md-6"><label htmlFor="device-imei-search" className="form-label">Tìm IMEI trong phiên bản</label><input id="device-imei-search" className="form-control" placeholder="Tra cứu IMEI..." value={query.imei} onChange={e => { setLoading(true); setQuery({ ...query, page: 1, imei: e.target.value }) }} /></div>
      <div className="col-md-6"><label htmlFor="device-status-filter" className="form-label">Trạng thái máy</label><select id="device-status-filter" className="form-select" value={query.status} onChange={e => { setLoading(true); setQuery({ ...query, page: 1, status: e.target.value }) }}><option value="">Tất cả trạng thái (ưu tiên khả dụng)</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    </div>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger" onClick={onChange}>Tải lại</button></div>}
    <p aria-live="polite">{loading ? 'Đang tải IMEI...' : `${result?.total || 0} máy phù hợp`}</p>
    <div className="table-responsive"><table className="table table-bordered align-middle" aria-busy={loading}><thead><tr><th>IMEI</th><th>Trạng thái</th><th>Mã đơn</th><th>Ngày nhập</th>{isAdmin && <th>Thao tác</th>}</tr></thead><tbody>
      {!loading && !error && result?.items.map(d => <tr key={d.id}><td><Link to={'/admin/imei?imei=' + d.imei}><strong>{d.imei}</strong></Link></td><td><span className={`badge bg-${badges[d.status]}`}>{labels[d.status]}</span></td><td className="text-break">{d.assignment?.orderId || '—'}</td><td>{formatDate(d.receivedAt)}</td>{isAdmin && <td>{!d.historicalOnly && ['available', 'quarantine', 'retired'].includes(d.status) && <select aria-label="Đổi trạng thái máy" className="form-select form-select-sm" disabled={busy} value={d.status} onChange={e => setStatusChange({ device: d, status: e.target.value })}>{['available', 'quarantine', 'retired'].map(key => <option key={key} value={key}>{labels[key]}</option>)}</select>}</td>}</tr>)}
      {!loading && !error && !result?.items.length && <tr><td colSpan={isAdmin ? 5 : 4}>Chưa có máy phù hợp.</td></tr>}
    </tbody></table></div>
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <span>Trang {result?.page || 1}/{result?.totalPages || 1} · Tối đa 20 máy/trang</span>
      <div className="btn-group"><button className="btn btn-outline-secondary btn-sm" disabled={loading || query.page <= 1} onClick={() => { setLoading(true); setQuery({ ...query, page: query.page - 1 }) }}>Trang trước</button><button className="btn btn-outline-secondary btn-sm" disabled={loading || query.page >= (result?.totalPages || 1)} onClick={() => { setLoading(true); setQuery({ ...query, page: query.page + 1 }) }}>Trang sau</button></div>
    </div>
    {statusChange && <AdminNoteModal title="Cập nhật trạng thái máy" description={`IMEI ${statusChange.device.imei} · Chuyển sang ${labels[statusChange.status]}`} busy={busy} onClose={() => setStatusChange(null)} onConfirm={changeStatus} />}
  </section>
}

function DeviceManager() {
  const [products, setProducts] = useState([]), [summary, setSummary] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const { brand, productId, version, color } = filters
  const [selected, setSelected] = useState(null), [refresh, setRefresh] = useState(0)
  const [suppliers, setSuppliers] = useState([]), [supplierId, setSupplierId] = useState(''), [purchaseCost, setPurchaseCost] = useState('')
  const [imeis, setImeis] = useState(''), [error, setError] = useState('')
  const [demoQuantity, setDemoQuantity] = useState(1), [generatedImeis, setGeneratedImeis] = useState([])
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const isAdmin = getCurrentUser()?.role === 'admin'
  const load = useCallback(async () => {
    try {
      const [p, s, suppliers] = await Promise.all([api.get('/products'), api.get('/devices/summary'), isAdmin ? api.get('/suppliers') : Promise.resolve({ data: [] })])
      setSuppliers(suppliers.data)
      setProducts(p.data); setSummary(s.data); setRefresh(value => value + 1); setError('')
    } catch (error) { setError(messageOf(error)) } finally { setLoading(false) }
  }, [isAdmin])
  useEffect(() => { let active = true; Promise.resolve().then(() => { if (active) return load() }); return () => { active = false } }, [load])
  const product = products.find(p => String(p.id) === productId)
  const brands = [...new Set(products.map(p => p.brand?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const brandProducts = products.filter(p => !brand || p.brand?.trim() === brand)
  const scopedProducts = brandProducts.filter(p => !productId || String(p.id) === productId)
  const versions = [...new Map(scopedProducts.flatMap(p => (p.variants || []).map(v => [versionKey(p, v), { key: versionKey(p, v), label: versionLabel(p, v), storage: v.storage, ram: v.ram || p.ram }]))).values()].sort((a, b) => compareVariants(a, b))
  const colors = [...new Set(scopedProducts.flatMap(p => (p.variants || []).filter(v => !version || versionKey(p, v) === version).map(v => v.color)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const matchesVariant = (p, v) => (!version || versionKey(p, v) === version) && (!color || v.color === color)
  const visibleProducts = scopedProducts.map(p => ({ product: p, variants: (p.variants || []).filter(v => matchesVariant(p, v)).sort((a, b) => compareVariants({ ...a, ram: a.ram || p.ram }, { ...b, ram: b.ram || p.ram })) })).filter(group => group.variants.length)
  const importChoices = product && version && color ? product.variants.filter(v => matchesVariant(product, v)) : []
  const importVariant = importChoices.length === 1 ? importChoices[0] : null
  const summaryByVariant = new Map(summary.map(s => [stockKey(s.productId, s.variantId), s]))
  const selectedProduct = products.find(p => String(p.id) === selected?.productId)
  const selectedVariant = selectedProduct?.variants.find(v => String(v.id) === selected?.variantId)
  const draftImeis = imeis.split(/[\s,;]+/).filter(Boolean)
  const generateDemo = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/devices/demo-imeis', { quantity: Number(demoQuantity), exclude: draftImeis })
      setImeis([...draftImeis, ...data.imeis].join('\n'))
      setGeneratedImeis(previous => [...previous, ...data.imeis])
      showToast(`Đã tạo ${data.imeis.length} IMEI demo. Bấm Nhập kho để lưu máy.`)
    } catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (!importVariant) { showToast('Chọn đúng dòng điện thoại, phiên bản và màu trước khi nhập kho', 'warning'); return }
    setBusy(true)
    try {
      await runCommand('receive-device', { productId: product.id, variantId: importVariant.id, supplierId: supplierId || null, purchaseCost: purchaseCost === '' ? null : Number(purchaseCost), imeis: draftImeis, simulatedImeis: generatedImeis.filter(imei => draftImeis.includes(imei)) })
      setImeis(''); setGeneratedImeis([]); showToast('Đã nhập máy vào kho'); await load()
    } catch (error) { showToast(messageOf(error), 'warning') } finally { setBusy(false) }
  }
  return <AdminLayout>
    <h2>Quản lý IMEI và tồn kho</h2>
    <p>Mỗi máy có một IMEI duy nhất. Lọc theo hãng, dòng điện thoại, phiên bản và màu để xem kho.</p>
    {error && <div className="alert alert-danger">{error} <button className="btn btn-sm btn-outline-danger" onClick={load}>Tải lại</button></div>}
    <div className="card p-3 mb-3"><div className="row g-2">
      <div className="col-sm-6 col-xl-3"><label htmlFor="inventory-brand" className="form-label">Hãng</label><select id="inventory-brand" className="form-select" value={brand} onChange={e => { setFilters({ ...initialFilters, brand: e.target.value }); setSelected(null) }}><option value="">Tất cả hãng</option>{brands.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
      <div className="col-sm-6 col-xl-3"><label htmlFor="inventory-product" className="form-label">Dòng điện thoại</label><select id="inventory-product" className="form-select" value={productId} onChange={e => { setFilters({ ...filters, productId: e.target.value, version: '', color: '' }); setSelected(null) }}><option value="">Tất cả dòng điện thoại</option>{brandProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="col-sm-6 col-xl-3"><label htmlFor="inventory-variant" className="form-label">Phiên bản (RAM / dung lượng)</label><select id="inventory-variant" className="form-select" value={version} onChange={e => { setFilters({ ...filters, version: e.target.value, color: '' }); setSelected(null) }}><option value="">Tất cả phiên bản</option>{versions.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}</select></div>
      <div className="col-sm-6 col-xl-3"><label htmlFor="inventory-color" className="form-label">Màu</label><select id="inventory-color" className="form-select" value={color} onChange={e => { setFilters({ ...filters, color: e.target.value }); setSelected(null) }}><option value="">Tất cả màu</option>{colors.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
    </div><div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"><span className="text-muted" aria-live="polite">{visibleProducts.length} dòng điện thoại · {visibleProducts.reduce((n, group) => n + group.variants.length, 0)} phiên bản</span><button className="btn btn-sm btn-outline-secondary" onClick={() => { setFilters(initialFilters); setSelected(null) }} disabled={!Object.values(filters).some(Boolean)}>Xóa bộ lọc</button></div></div>
    {isAdmin && <form onSubmit={submit} className="card p-3 mb-3"><AdminFormSection title="Nhập máy theo phiên bản" description="Chọn đúng phiên bản, nhập mã hoặc tạo IMEI demo rồi lưu máy vào kho."><p className="text-muted mb-2">{importVariant ? `${product.name} · ${versionLabel(product, importVariant)} · ${importVariant.color}` : 'Chọn dòng điện thoại, phiên bản và màu ở bộ lọc để nhập đúng máy.'}</p><div className="d-flex align-items-end flex-wrap gap-2 mb-3"><div><label htmlFor="demo-imei-quantity" className="form-label">Số mã demo</label><input id="demo-imei-quantity" className="form-control" style={{ maxWidth: 130 }} type="number" min="1" max={Math.max(0, 500 - draftImeis.length)} step="1" value={demoQuantity} disabled={busy} onChange={e => setDemoQuantity(e.target.value)} /></div><button type="button" className="btn btn-outline-primary" disabled={busy || !Number.isInteger(Number(demoQuantity)) || Number(demoQuantity) < 1 || Number(demoQuantity) + draftImeis.length > 500} onClick={generateDemo}>Tạo IMEI demo</button><small className="text-muted">Mã hợp lệ, chưa lưu kho. Tối đa 500 máy mỗi lần nhập.</small></div><div className="row g-3 mb-3"><div className="col-md-6"><label htmlFor="quick-supplier">Nhà cung cấp (không bắt buộc)</label><select id="quick-supplier" className="form-select" value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Chưa xác định</option>{suppliers.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="col-md-6"><label htmlFor="quick-cost">Giá nhập mỗi máy (₫, có thể để trống)</label><input id="quick-cost" className="form-control" type="number" min="0" step="1" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} /></div></div><label htmlFor="receive-imeis" className="form-label">Danh sách IMEI (mỗi IMEI một dòng)</label><textarea id="receive-imeis" required className="form-control mb-2" rows="4" value={imeis} onChange={e => setImeis(e.target.value)} placeholder="Nhập IMEI 15 chữ số hợp lệ hoặc bấm Tạo IMEI demo" /><small className="admin-field-hint" aria-live="polite">{draftImeis.length}/500 mã · Mỗi IMEI một dòng, gồm 15 chữ số hợp lệ.</small></AdminFormSection><div className="admin-form-actions"><button type="submit" className="btn btn-success" disabled={busy || !importVariant}>Nhập kho</button><small>{importVariant ? 'Máy sẽ được lưu vào phiên bản đang chọn.' : 'Chọn dòng điện thoại, phiên bản và màu để tiếp tục.'}</small></div></form>}
    <details className="inventory-help mb-3"><summary>Cách đọc số liệu kho</summary><div className="mt-2"><p><strong>Tổng kho:</strong> máy khả dụng, đã phân bổ và chờ kiểm tra còn tại kho. Không tính máy đang giao, đã bán, chờ nhận lại hoặc ngừng sử dụng.</p><p><strong>Đang xử lí:</strong> số máy khách đã đặt, gồm máy chưa gán IMEI và máy đã phân bổ, chưa xuất giao. <strong>Sẵn bán:</strong> số máy có thể nhận thêm đơn mới; sản phẩm/phiên bản ngừng bán hiển thị 0.</p><p className="mb-0"><strong>Bảo hành:</strong> số máy có phiếu đang tiếp nhận, kiểm tra, sửa hoặc chờ trả; không phải số máy còn hạn bảo hành. Máy bảo hành có thể đồng thời nằm trong cột Đã bán.</p></div></details>
    {loading && <p>Đang tải kho...</p>}
    {!loading && !visibleProducts.length && <div className="alert alert-light border" role="status">{products.length ? 'Không có phiên bản phù hợp với bộ lọc.' : 'Chưa có sản phẩm.'}</div>}
    {visibleProducts.map(({ product: p, variants }) => <section className="card p-3 mb-3" key={p.id}>
      <div className="d-flex align-items-center gap-2 mb-2"><h4 className="mb-0">{p.name}</h4>{p.brand && <span className="badge text-bg-light border">{p.brand}</span>}</div>
      <div className="table-responsive"><table className="table table-bordered align-middle variant-stock-table"><thead><tr><th>Màu</th><th>Dung lượng</th><th title="Máy còn tại kho, gồm máy đã phân bổ và chờ kiểm tra">Tổng kho</th><th className="stock-col-processing" title="Máy của đơn chưa xuất giao, gồm chưa gán và đã gán IMEI">Đang xử lí</th><th className="stock-col-ready" title="Số máy có thể bán cho đơn mới">Sẵn bán</th><th className="stock-col-shipping">Đang giao</th><th className="stock-col-sold">Đã bán</th><th className="stock-col-warranty" title="Số máy có phiếu bảo hành đang mở">Bảo hành</th><th>Chờ nhận lại</th><th>Chờ kiểm tra</th><th>Thao tác</th></tr></thead><tbody>
        {variants.map(v => {
          const s = summaryByVariant.get(stockKey(p.id, v.id))
          const counts = s?.counts || {}, expanded = String(p.id) === selected?.productId && String(v.id) === selected?.variantId
          const inStock = s?.inStock ?? ((counts.available || 0) + (counts.allocated || 0) + (counts.quarantine || 0))
          const processing = s?.processing ?? ((s?.unallocatedHolds || 0) + (counts.allocated || 0))
          const readyToSell = s?.readyToSell ?? (p.status === 'active' && v.status !== 'inactive' ? s?.sellable || 0 : 0)
          return <tr key={v.id} data-variant-id={v.id}><td>{v.color}{(p.status !== 'active' || v.status === 'inactive') && <small className="d-block text-muted">Ngừng bán</small>}</td><td>{v.storage}{(v.ram || p.ram) && <small className="d-block text-muted">RAM {v.ram || p.ram}</small>}</td><td><StockNumber value={inStock} /></td><td className="stock-col-processing"><StockNumber value={processing} /></td><td className="stock-col-ready"><StockNumber value={readyToSell} /></td><td className="stock-col-shipping"><StockNumber value={counts.shipping || 0} /></td><td className="stock-col-sold"><StockNumber value={counts.sold || 0} /></td><td className="stock-col-warranty"><StockNumber value={s?.underWarranty ?? '—'} /></td><td><StockNumber value={counts.return_pending || 0} /></td><td><StockNumber value={counts.quarantine || 0} /></td><td><button className="btn btn-sm btn-outline-primary" aria-expanded={expanded} onClick={() => setSelected(expanded ? null : { productId: String(p.id), variantId: String(v.id) })}>{expanded ? 'Thu gọn IMEI' : 'Xem IMEI'}</button></td></tr>
        })}
      </tbody></table></div>
      {selectedProduct === p && selectedVariant && <VariantDevices key={JSON.stringify(selected)} product={p} variant={selectedVariant} isAdmin={isAdmin} refresh={refresh} onClose={() => setSelected(null)} onChange={load} />}
    </section>)}
  </AdminLayout>
}
export default DeviceManager
