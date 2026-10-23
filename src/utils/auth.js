import api from '../services/api'

export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('currentUser')) || null
}

export const saveCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export const logout = () => {
  const token = localStorage.getItem('authToken')
  if (token) api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  localStorage.removeItem('currentUser')
  localStorage.removeItem('authToken')
}
