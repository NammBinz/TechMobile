import api from './api'

export const messageOf = error => error.response?.data?.message || 'Không thể thực hiện thao tác. Vui lòng tải lại và thử lại.'
// A caller may retain operationId to retry an uncertain network result safely.
export const runCommand = async (action, payload, operationId) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ action, payload, user: localStorage.getItem('currentUser') })))
  const key = 'operation:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const requestId = operationId || sessionStorage.getItem(key) || crypto.randomUUID()
  sessionStorage.setItem(key, requestId)
  try {
    const response = await api.post(`/commands/${action}`, payload, { headers: { 'Idempotency-Key': requestId } })
    sessionStorage.removeItem(key)
    window.dispatchEvent(new Event('inventoryUpdated'))
    return response.data
  } catch (error) {
    // Retain uncertain requests across reloads; validation failures may use a new key.
    if (error.response && error.response.status < 500) sessionStorage.removeItem(key)
    throw error
  }
}
