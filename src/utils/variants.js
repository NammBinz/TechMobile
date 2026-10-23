export const variantKey = (productId, variantId) => JSON.stringify([String(productId), String(variantId)])
export const claimLabels = { received: 'Đã tiếp nhận', inspecting: 'Đang kiểm tra', repairing: 'Đang sửa', ready: 'Sẵn sàng trả', returned: 'Đã trả máy', rejected: 'Từ chối' }

export const withVariant = (product, variant) => ({
  ...product,
  ...variant,
  id: product.id,
  productId: product.id,
  variantId: variant.id,
  cartKey: variantKey(product.id, variant.id),
  name: product.name,
  image: variant.image || product.image,
  status: product.status === 'active' && variant.status !== 'inactive' ? 'active' : 'inactive'
})

export const formatDate = value => {
  if (!value) return 'Chưa ghi nhận'
  if (!value.includes('T')) return value
  return new Date(value).toLocaleString('vi-VN')
}

export const warrantyLabel = warranty => {
  if (warranty.status === 'void') return 'Đã hủy bảo hành'
  if (warranty.status === 'suspended') return 'Tạm ngưng'
  const timestamp = Date.now()
  if (timestamp < Date.parse(warranty.startsAt)) return 'Chưa bắt đầu'
  return timestamp < Date.parse(warranty.endsAt) ? 'Còn bảo hành' : 'Hết hạn'
}
