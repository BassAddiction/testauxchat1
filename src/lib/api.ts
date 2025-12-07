// API Configuration - Direct URLs to Yandex Cloud Functions
import { FUNCTIONS } from './func2url';

console.log('[API CONFIG] Using direct Yandex Cloud function URLs');

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
    const res = await fetch(FUNCTIONS.login, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, password }),
    });
    return res.json();
  },

  async register(username: string, phone: string, password: string, code: string) {
    const res = await fetch(FUNCTIONS.register, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, phone, password, code }),
    });
    return res.json();
  },

  async sendSMS(phone: string) {
    const res = await fetch(FUNCTIONS['send-sms'], {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone }),
    });
    return res.json();
  },

  async verifySMS(phone: string, code: string) {
    const res = await fetch(FUNCTIONS['verify-sms'], {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, code }),
    });
    return res.json();
  },

  async resetPassword(phone: string, code: string, newPassword: string) {
    const res = await fetch(FUNCTIONS['reset-password'], {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, code, new_password: newPassword }),
    });
    return res.json();
  },

  // User endpoints
  async getUser(userId?: string) {
    const res = await fetch(FUNCTIONS['get-user'], {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async updateActivity(userId: string) {
    const res = await fetch(FUNCTIONS['update-activity'], {
      method: 'POST',
      headers: this.headers(userId),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },

  // updateUsername not implemented in backend yet
  async updateUsername(userId: string, newUsername: string) {
    throw new Error('Update username not implemented');
  },

  // Messages endpoints
  async getMessages(limit = 20, offset = 0) {
    const res = await fetch(`${FUNCTIONS['get-messages']}?limit=${limit}&offset=${offset}`);
    return res.json();
  },

  async sendMessage(userId: string, receiverId: number, content?: string, voiceUrl?: string, voiceDuration?: number) {
    // receiverId === 0 means global chat, otherwise private message
    if (receiverId === 0) {
      // Global chat
      const res = await fetch(FUNCTIONS['send-message'], {
        method: 'POST',
        headers: this.headers(userId),
        body: JSON.stringify({ 
          user_id: parseInt(userId),
          text: content || '',
        }),
      });
      return res.json();
    } else {
      // Private message
      const res = await fetch(FUNCTIONS['private-messages'], {
        method: 'POST',
        headers: this.headers(userId),
        body: JSON.stringify({ 
          receiverId,
          text: content || '',
          voiceUrl,
          voiceDuration,
        }),
      });
      return res.json();
    }
  },

  // Conversations
  async getConversations(userId: string) {
    const res = await fetch(FUNCTIONS['get-conversations'], {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getConversationMessages(conversationId: number, userId: string) {
    // For private messages, conversationId is the other user's ID
    const res = await fetch(`${FUNCTIONS['private-messages']}?otherUserId=${conversationId}`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getUnreadCount(userId: string) {
    // Use get-conversations which includes unread counts
    const res = await fetch(FUNCTIONS['get-conversations'], {
      headers: this.headers(userId),
    });
    const data = await res.json();
    const total = data.conversations?.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0) || 0;
    return { unreadCount: total };
  },

  // Subscriptions
  async getSubscriptions(userId: string) {
    const res = await fetch(FUNCTIONS['get-subscriptions'], {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async subscribe(userId: string, targetUserId: number) {
    const res = await fetch(FUNCTIONS.subscribe, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ targetUserId }),
    });
    return res.json();
  },

  async unsubscribe(userId: string, targetUserId: number) {
    const res = await fetch(`${FUNCTIONS.subscribe}?targetUserId=${targetUserId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  // Photos
  async getProfilePhotos(userId: string) {
    const res = await fetch(FUNCTIONS['profile-photos'], {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async addPhoto(userId: string, photoUrl: string) {
    const res = await fetch(FUNCTIONS['profile-photos'], {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ photo_url: photoUrl }),
    });
    return res.json();
  },

  async deletePhoto(userId: string, photoId: number) {
    const res = await fetch(`${FUNCTIONS['profile-photos']}?photoId=${photoId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  async getUploadUrl(contentType: string, extension: string) {
    const res = await fetch(
      `${FUNCTIONS['generate-upload-url']}?contentType=${encodeURIComponent(contentType)}&extension=${extension}`
    );
    return res.json();
  },

  // Blacklist
  async getBlacklist(userId: string) {
    const res = await fetch(FUNCTIONS.blacklist, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async checkBlockStatus(userId: string, targetUserId: number) {
    const res = await fetch(`${FUNCTIONS.blacklist}?targetUserId=${targetUserId}`, {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async blockUser(userId: string, targetUserId: number) {
    const res = await fetch(FUNCTIONS.blacklist, {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ user_id: targetUserId }),
    });
    return res.json();
  },

  async unblockUser(userId: string, targetUserId: number) {
    const res = await fetch(`${FUNCTIONS.blacklist}?targetUserId=${targetUserId}`, {
      method: 'DELETE',
      headers: this.headers(userId),
    });
    return res.json();
  },

  // Admin
  async getAdminUsers(userId: string) {
    const res = await fetch(FUNCTIONS['admin-users'], {
      headers: this.headers(userId),
    });
    return res.json();
  },

  async adminAction(userId: string, targetUserId: number, action: string, amount?: number) {
    const res = await fetch(FUNCTIONS['admin-users'], {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ user_id: targetUserId, action, amount }),
    });
    return res.json();
  },

  // Payment
  async createPayment(userId: string, amount: number, description: string) {
    const res = await fetch(FUNCTIONS['create-payment'], {
      method: 'POST',
      headers: this.headers(userId),
      body: JSON.stringify({ amount, description }),
    });
    return res.json();
  },
};