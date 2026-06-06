import api from './client'

export const authApi = {
  login: d => api.post('/auth/login', d),
  register: d => api.post('/auth/register', d),
  refresh: d => api.post('/auth/refresh', d),
  logout: d => api.post('/auth/logout', d),
}

export const listingApi = {
  search: p => api.get('/products', { params: p }),
  getById: id => api.get(`/products/${id}`),
  mine: () => api.get('/products/mine'),
  create: d => api.post('/products', d),
  update: (id, d) => api.put(`/products/${id}`, d),
  remove: id => api.delete(`/products/${id}`),
}

export const categoryApi = {
  all: () => api.get('/categories'),
}

export const noteApi = {
  all: p => api.get('/notes', { params: p }),
  getById: id => api.get(`/notes/${id}`),
  create: d => api.post('/notes', d),
  upload: d => api.post('/notes', d),
  download: id => api.get(`/notes/${id}/download`),
  recordDownload: id => api.post(`/notes/${id}/download`),
}

export const orderApi = {
  mine: () => api.get('/orders'),
  create: productId => api.post('/orders', { productId }),
  status: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  qr: id => api.get(`/qr/orders/${id}`, { responseType: 'blob' }),
}

export const qrApi = {
  verify: token => api.post('/qr/verify', { token }),
}

export const verificationApi = {
  mine: () => api.get('/verifications/mine'),
  submit: idCardUrl => api.post('/verifications', { idCardUrl }),
}

export const uploadApi = {
  file: (file, folder) => {
    const d = new FormData()
    d.append('file', file)
    d.append('folder', folder)
    return api.post('/uploads', d)
  },
}

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: params => api.get('/admin/users', { params }),
  blockUser: id => api.patch(`/admin/users/${id}/block`),
  unblockUser: id => api.patch(`/admin/users/${id}/unblock`),
  verifications: params => api.get('/admin/verifications', { params }),
  approveVerification: (id, remarks = 'Approved') =>
    api.patch(`/admin/verifications/${id}/approve`, { status: 'APPROVED', remarks }),
  rejectVerification: (id, remarks = 'Rejected') =>
    api.patch(`/admin/verifications/${id}/reject`, { status: 'REJECTED', remarks }),
  products: params => api.get('/admin/products', { params }),
  removeProduct: id => api.delete(`/admin/products/${id}`),
  notes: params => api.get('/admin/notes', { params }),
  removeNote: id => api.delete(`/admin/notes/${id}`),
}

export const chatApi = {
  history: (otherUserId, params) => api.get(`/chat/${otherUserId}`, { params }),
  online: () => api.get('/chat/online'),
  markRead: otherUserId => api.post(`/chat/${otherUserId}/read`),
}

export const notificationApi = {
  all: params => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: id => api.patch(`/notifications/${id}/read`),
}

export const reviewApi = {
  forUser: id => api.get(`/reviews/user/${id}`),
  create: d => api.post('/reviews', d),
}
