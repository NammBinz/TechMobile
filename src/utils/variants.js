export const variantKey = (productId, variantId) => JSON.stringify([String(productId), String(variantId)])
export const claimLabels = { received: 'Đã tiếp nhận', inspecting: 'Đang kiểm tra', repairing: 'Đang sửa', ready: 'Sẵn sàng trả', returned: 'Đã trả máy', rejected: 'Từ chối' }

export const withVariant = (product, variant) => ({
  ...product,
  ...variant,
  id: product.id,
  legacyIds: product.legacyIds || [],
  variantLegacyIds: variant.legacyIds || [],
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

export const capacityInGB = value => {
  const match = String(value || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)?$/i)
  if (!match) return Infinity
  return Number(match[1].replace(',', '.')) * ({ TB: 1024, GB: 1, MB: 1 / 1024 }[match[2]?.toUpperCase()] || 1)
}
export const compareVariants = (a, b) => capacityInGB(a.ram) - capacityInGB(b.ram) || capacityInGB(a.storage) - capacityInGB(b.storage) || String(a.color || '').localeCompare(String(b.color || ''), 'vi')
export const versionOptionKey = (product, variant) => JSON.stringify([String(variant.ram || product.ram || '').trim().toUpperCase(), String(variant.storage || '').trim().toUpperCase()])
