// API Configuration
const API_BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:8000';

export const API = {
  // Auth
  register: `${API_BASE_URL}/register`,
  login: `${API_BASE_URL}/login`,
  
  // User
  user: `${API_BASE_URL}/user`,
  updateActivity: `${API_BASE_URL}/update-activity`,
  
  // Messages
  messages: `${API_BASE_URL}/messages`,
  conversationMessages: (id: number) => `${API_BASE_URL}/messages/${id}`,
  conversations: `${API_BASE_URL}/conversations`,
  unreadCount: `${API_BASE_URL}/unread-count`,
  
  // Subscriptions
  subscriptions: `${API_BASE_URL}/subscriptions`,
  subscribe: (userId: number) => `${API_BASE_URL}/subscribe/${userId}`,
  
  // Photos
  profilePhotos: `${API_BASE_URL}/profile-photos`,
  uploadUrl: `${API_BASE_URL}/upload-url`,
  
  // Blacklist
  blacklist: `${API_BASE_URL}/blacklist`,
  
  // Admin
  adminUsers: `${API_BASE_URL}/admin/users`,
  
  // Payment
  createPayment: `${API_BASE_URL}/payment/create`,
  paymentWebhook: `${API_BASE_URL}/payment/webhook`,
};