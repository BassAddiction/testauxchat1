// API Configuration
import func2url from '../../backend/func2url.json';

export const API = {
  // Auth
  register: func2url.register,
  login: func2url.login,
  
  // User
  user: func2url['get-user'],
  updateActivity: func2url['update-activity'],
  
  // Messages
  messages: func2url['get-messages'],
  conversationMessages: (id: number) => `${func2url['private-messages']}?conversation_id=${id}`,
  conversations: func2url['get-conversations'],
  unreadCount: func2url['get-messages'] + '?unread=true',
  
  // Subscriptions
  subscriptions: func2url['get-subscriptions'],
  subscribe: (userId: number) => `${func2url.subscribe}?user_id=${userId}`,
  
  // Photos
  profilePhotos: func2url['profile-photos'],
  uploadUrl: func2url['generate-upload-url'],
  
  // Blacklist
  blacklist: func2url.blacklist,
  
  // Admin
  adminUsers: func2url['admin-users'],
  
  // Payment
  createPayment: func2url['create-payment'],
  paymentWebhook: func2url['payment-webhook'],
};