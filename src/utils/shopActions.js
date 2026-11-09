import { matchesId } from './entityIds'
// Chuyển chuỗi JSON thành object JavaScript > return
export const getCart = () => {
  return JSON.parse(localStorage.getItem('cart')) || []
}

// Chuyển object JavaScript thành chuỗi JSON > Lưu cart
// Tạo event cartUpdated > component cập nhật lại giao diện
export const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart))
  window.dispatchEvent(new Event('cartUpdated'))
}

export const getCompareList = () => {
  return JSON.parse(localStorage.getItem('compareList')) || []
}

export const saveCompareList = (compareList) => {
  localStorage.setItem('compareList', JSON.stringify(compareList))
  window.dispatchEvent(new Event('compareUpdated'))
}

// Hiện thông báo
export const showToast = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('showToast', {detail: { message, type }}))
}

export const addToCart = (product) => {
  if (product.status !== 'active') {
    showToast('Sản phẩm hiện không còn kinh doanh', 'warning')
    return
  }

  if (Number(product.quantity) <= 0) {
    showToast('Sản phẩm đã hết hàng', 'warning')
    return
  }

  if (!product.variantId || !Number.isFinite(product.quantity)) {
    showToast('Vui lòng mở chi tiết và chọn phiên bản sản phẩm', 'warning')
    return
  }

  const cart = getCart()
  const productCartKey = product.cartKey || product.id

  const index = cart.findIndex((item) => {
    return (item.cartKey || item.id) === productCartKey || (matchesId(product, item.productId || item.id) && matchesId({ id: product.variantId, legacyIds: product.variantLegacyIds }, item.variantId))
  })

  if (index !== -1) {
    if (cart[index].cartQuantity >= product.quantity) {
      showToast('Số lượng mua không được vượt quá tồn kho', 'warning')
      return
    }

    cart[index] = { ...product, productId: product.productId || product.id, cartKey: productCartKey, cartQuantity: cart[index].cartQuantity + 1 }
  } else {
    cart.push({
      ...product,
      cartKey: productCartKey,
      productId: product.productId || product.id,
      cartQuantity: 1
    })
  }

  saveCart(cart)
  showToast(`Đã thêm ${product.name} vào giỏ hàng`, 'success')
}

export const removeFromCart = (cartKey) => {
  const cart = getCart().filter((item) => {
    return (item.cartKey || item.id) !== cartKey
  })

  saveCart(cart)
  showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info')
}

// Thêm / bỏ sản phẩm so sánh
export const toggleCompareProduct = (product) => {
  let compareList = getCompareList()

  const isExist = compareList.find((item) => matchesId(product, item.id))

  if (isExist) {
    compareList = compareList.filter((item) => !matchesId(product, item.id))
    saveCompareList(compareList)
    showToast(`Đã bỏ ${product.name} khỏi so sánh`, 'info')
    return
  }

  if (compareList.length >= 3) {
    showToast('Bạn chỉ có thể so sánh tối đa 3 sản phẩm', 'warning')
    return
  }

  compareList.push(product)
  saveCompareList(compareList)
  showToast(`Đã thêm ${product.name} vào so sánh`, 'success')
}

export const removeCompareProduct = (productId) => {
  const compareList = getCompareList().filter((item) => item.id !== productId)

  saveCompareList(compareList)
  showToast('Đã bỏ sản phẩm khỏi so sánh', 'info')
}

export const getWishlist = () => {
  return JSON.parse(localStorage.getItem('wishlist')) || []
}

export const saveWishlist = (wishlist) => {
  localStorage.setItem('wishlist', JSON.stringify(wishlist))
}

export const isInWishlist = (productId) => {
  const wishlist = getWishlist()

  return wishlist.some((item) => {
    return typeof productId === 'object' ? matchesId(productId, item.id) : matchesId(item, productId)
  })
}

export const toggleWishlistProduct = (product) => {
  const wishlist = getWishlist()

  const existed = wishlist.find((item) => {
    return matchesId(product, item.id)
  })

  let newWishlist = []

  if (existed) {
    newWishlist = wishlist.filter((item) => {
      return !matchesId(product, item.id)
    })

    saveWishlist(newWishlist)
    showToast('Đã bỏ sản phẩm khỏi yêu thích', 'info')
  } else {
    const wishlistItem = {
      id: product.id,
      legacyIds: product.legacyIds || [],
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.image,
      brand: product.brand,
      storage: product.storage,
      rating: product.rating,
      reviews: product.reviews,
      status: product.status || 'active'
    }

    newWishlist = [...wishlist, wishlistItem]

    saveWishlist(newWishlist)
    showToast('Đã thêm sản phẩm vào yêu thích', 'success')
  }

  window.dispatchEvent(new Event('wishlistUpdated'))

  return newWishlist
}

export const removeWishlistProduct = (productId) => {
  const wishlist = getWishlist()

  const newWishlist = wishlist.filter((item) => {
    return String(item.id) !== String(productId)
  })

  saveWishlist(newWishlist)
  window.dispatchEvent(new Event('wishlistUpdated'))

  return newWishlist
}
