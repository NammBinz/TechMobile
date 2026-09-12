export const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('currentUser')) || null
}

export const saveCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export const logout = () => {
  localStorage.removeItem('currentUser')
}