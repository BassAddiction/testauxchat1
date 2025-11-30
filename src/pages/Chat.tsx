import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    username: string;
    avatarUrl: string | null;
  };
}

interface UserProfile {
  id: number;
  username: string;
  avatar: string;
  status: string;
}

export default function Chat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = localStorage.getItem('userId');
  const currentUsername = localStorage.getItem('username') || 'Я';

  useEffect(() => {
    loadProfile();
    loadCurrentUserProfile();
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${userId}`
      );
      const data = await response.json();
      
      const photosResponse = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
        { headers: { 'X-User-Id': currentUserId || '0' } }
      );
      const photosData = await photosResponse.json();
      const userAvatar = photosData.photos && photosData.photos.length > 0 
        ? photosData.photos[0].url 
        : data.avatar || '';
      
      setProfile({ ...data, avatar: userAvatar });
    } catch (error) {
      toast.error('Ошибка загрузки профиля');
    }
  };

  const loadCurrentUserProfile = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${currentUserId}`
      );
      const data = await response.json();
      
      const photosResponse = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${currentUserId}`,
        { headers: { 'X-User-Id': currentUserId || '0' } }
      );
      const photosData = await photosResponse.json();
      const userAvatar = photosData.photos && photosData.photos.length > 0 
        ? photosData.photos[0].url 
        : data.avatar || '';
      
      setCurrentUserProfile({ ...data, avatar: userAvatar });
    } catch (error) {
      console.error('Error loading current user profile');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/0222e582-5c06-4780-85fa-c9145e5bba14?otherUserId=${userId}`,
        {
          headers: {
            'X-User-Id': currentUserId || '0'
          }
        }
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(
        'https://functions.poehali.dev/0222e582-5c06-4780-85fa-c9145e5bba14',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId || '0'
          },
          body: JSON.stringify({
            receiverId: Number(userId),
            text: newMessage
          })
        }
      );

      if (response.ok) {
        setNewMessage('');
        loadMessages();
      } else {
        toast.error('Ошибка отправки сообщения');
      }
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin">
          <Icon name="Loader2" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col">
      <div className="bg-card/90 backdrop-blur border-b border-purple-500/20 p-3 sm:p-4 sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="flex-shrink-0"
          >
            <Icon name="ArrowLeft" size={20} />
          </Button>

          {profile && (
            <button
              onClick={() => navigate(`/profile/${userId}`)}
              className="flex items-center gap-2 sm:gap-3 flex-1 hover:bg-accent/50 rounded-lg p-1 sm:p-2 transition-colors min-w-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile.username[0]?.toUpperCase()
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base truncate">{profile.username}</p>
                <p className={`text-xs ${
                  profile.status === 'online' ? 'text-green-400' : 'text-muted-foreground'
                }`}>
                  {profile.status === 'online' ? 'Онлайн' : 'Не в сети'}
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 container mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile?.username[0]?.toUpperCase()
              )}
            </div>
            <p className="text-muted-foreground text-center px-4">Нет сообщений. Начните диалог!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = String(message.senderId) === String(currentUserId);
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {message.sender.avatarUrl ? (
                        <img src={message.sender.avatarUrl} alt={message.sender.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        message.sender.username[0]?.toUpperCase()
                      )}
                    </div>
                  )}
                  <div className="max-w-[70%] sm:max-w-[60%]">
                    <Card className={`p-2 sm:p-3 ${
                      isOwn
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-card'
                    }`}>
                      <p className="break-words text-sm sm:text-base">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-purple-100' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </Card>
                  </div>
                  {isOwn && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {currentUserProfile?.avatar ? (
                        <img src={currentUserProfile.avatar} alt={currentUsername} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        currentUsername[0]?.toUpperCase()
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-card/90 backdrop-blur border-t border-purple-500/20 p-3 sm:p-4">
        <div className="container mx-auto max-w-4xl flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Написать сообщение..."
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-background border border-border resize-none text-sm sm:text-base"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 sm:px-6 flex-shrink-0"
          >
            <Icon name="Send" size={18} className="sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}