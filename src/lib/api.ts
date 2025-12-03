// API Configuration - Single source of truth for all API calls
const API_BASE = import.meta.env.PROD ? 'https://api.auxchat.ru' : 'http://localhost:8000';

export const api = {
  // Helper to add auth header
  headers(userId?: string | null) {
    const id = userId || localStorage.getItem('auxchat_user_id');
    return {
      'Content-Type': 'application/json',
      ...(id && { 'X-User-Id': id }),
    };
  },

  // Auth endpoints
  async login(phone: string, password: string) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username: phone, password }),
    });
    return res.json();
  },

  async register(username: string, phone: string, password: string, code: string) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, phone, password, code }),
    });
    return res.json();
  },

  async sendSMS(phone: string) {
    const res = await fetch(`${API_BASE}/send-sms`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  async verifySMS(phone: string, code: string) {
    const res = await fetch(`${API_BASE}/verify-sms`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, code }),
    });
    return res.json();
  },

  async resetPassword(phone: string, code: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, code, new_password: newPassword }),
    });
    return res.json();
  },

  // User endpoints
  async getUser(userId?: string) {
    const res = await fetch(`${API_BASE}/user`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async updateActivity(userId: string) {
    const res = await fetch(`${API_BASE}/update-activity`, {
      method: 'POST',
      headers: this.headers(userId),
    });
    return res.json();
  },

  async updateUsername(userId: string, newUsername: string) {
    const res = await fetch(`${API_BASE}/update-username`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ username: newUsername }),
    });
    return res.json();
  },

  // Messages endpoints
  async getMessages(limit = 20, offset = 0) {
    const res = await fetch(`${API_BASE}/messages?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  async sendMessage(userId: string, content: string, voiceUrl?: string, voiceDuration?: number) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ 
        conversation_id: 1, // Global chat
        content,
        voice_url: voiceUrl,
        voice_duration: voiceDuration,
      }),
    });
    return res.json();
  },

  // Conversations
  async getConversations(userId: string) {
    const res = await fetch(`${API_BASE}/conversations`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getConversationMessages(conversationId: number, userId: string) {
    const res = await fetch(`${API_BASE}/messages/${conversationId}`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getUnreadCount(userId: string) {
    const res = await fetch(`${API_BASE}/unread-count`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  // Subscriptions
  async getSubscriptions(userId: string) {
    const res = await fetch(`${API_BASE}/subscriptions`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async subscribe(userId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/subscribe/${targetUserId}`, {
      method: 'POST',
      headers: this.headers(userId),
    });
    return res.json();
  },

  async unsubscribe(userId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/subscribe/${targetUserId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  // Photos
  async getProfilePhotos(userId: string) {
    const res = await fetch(`${API_BASE}/profile-photos`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async addPhoto(userId: string, photoUrl: string) {
    const res = await fetch(`${API_BASE}/profile-photos`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ photo_url: photoUrl }),
    });
    return res.json();
  },

  async deletePhoto(userId: string, photoId: number) {
    const res = await fetch(`${API_BASE}/profile-photos/${photoId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getUploadUrl(contentType: string, extension: string) {
    const res = await fetch(
      `${API_BASE}/upload-url?contentType=${encodeURIComponent(contentType)}&extension=${extension}`
    );
    return res.json();
  },

  // Blacklist
  async getBlacklist(userId: string) {
    const res = await fetch(`${API_BASE}/blacklist`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async checkBlockStatus(userId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/blacklist/${targetUserId}`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async blockUser(userId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/blacklist`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ user_id: targetUserId }),
    });
    return res.json();
  },

  async unblockUser(userId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/blacklist/${targetUserId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  // Admin
  async getAdminUsers(userId: string) {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async adminAction(userId: string, targetUserId: number, action: string, amount?: number) {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ user_id: targetUserId, action, amount }),
    });
    return res.json();
  },

  // Payment
  async createPayment(userId: string, amount: number, description: string) {
    const res = await fetch(`${API_BASE}/payment/create`, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ amount, description }),
    });
    return res.json();
  },
};