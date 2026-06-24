import { authClient } from '../api/client'

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return undefined
  return metadata
}

export function trackActivity(activityType, { entityType, entityId, metadata } = {}) {
  if (!activityType) return Promise.resolve(null)

  const token = localStorage.getItem('token')
  return authClient.post('/activity', {
    activityType,
    entityType,
    entityId,
    metadata: sanitizeMetadata(metadata),
  }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch(() => null)
}

export const activityTracker = {
  login: (metadata = {}) => trackActivity('LOGIN', { entityType: 'USER', metadata }),
  noteViewed: (noteId, metadata = {}) =>
    trackActivity('VIEW_NOTE', { entityType: 'NOTE', entityId: noteId, metadata }),
  noteDownloaded: (noteId, metadata = {}) =>
    trackActivity('DOWNLOAD_NOTE', { entityType: 'NOTE', entityId: noteId, metadata }),
  noteBookmarked: (noteId, metadata = {}) =>
    trackActivity('BOOKMARK_NOTE', { entityType: 'NOTE', entityId: noteId, metadata }),
  noteRated: (noteId, metadata = {}) =>
    trackActivity('RATE_NOTE', { entityType: 'NOTE', entityId: noteId, metadata }),
  noteUploaded: (noteId, metadata = {}) =>
    trackActivity('UPLOAD_NOTE', { entityType: 'NOTE', entityId: noteId, metadata }),
  productViewed: (productId, metadata = {}) =>
    trackActivity('VIEW_PRODUCT', { entityType: 'PRODUCT', entityId: productId, metadata }),
  productWishlisted: (productId, metadata = {}) =>
    trackActivity('WISHLIST_PRODUCT', { entityType: 'PRODUCT', entityId: productId, metadata }),
  search: (metadata = {}, entityType = 'SYSTEM') =>
    trackActivity('SEARCH', { entityType, metadata }),
  chatSent: (chatUserId, metadata = {}) =>
    trackActivity('CHAT_SENT', { entityType: 'CHAT', entityId: chatUserId, metadata }),
}
