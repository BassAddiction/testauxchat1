import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  userId: number;
  username: string;
  avatar: string;
  text: string;
  timestamp: Date;
}

interface UserProfile {
  id: number;
  username: string;
  avatar: string;
}

export default function UserMessages() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(20);

  const currentUserId = localStorage.getItem('auxchat_user_id');

  useEffect(() => {
    if (!currentUserId) {
      navigate('/');
      return;
    }
    loadProfile();
    loadMessages();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${userId}`
      );
      const data = await response.json();
      
      const photosResponse = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
        {
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      const photosData = await photosResponse.json();
      const userAvatar = photosData.photos && photosData.photos.length > 0 
        ? photosData.photos[0].url 
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;
      
      setProfile({ id: data.id, username: data.username, avatar: userAvatar });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/392f3078-9f28-4640-ab86-dcabecaf721a?limit=100&offset=0`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          const userMessages = data.messages
            .filter((msg: any) => msg.user.id === Number(userId))
            .map((msg: any) => ({
              id: msg.id,
              userId: msg.user.id,
              username: msg.user.username,
              avatar: msg.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user.username}`,
              text: msg.text,
              timestamp: new Date(msg.created_at),
            }));
          setMessages(userMessages);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Icon name="Loader2" size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-3 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/subscriptions')}
          className="h-8 w-8 p-0"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
        {profile && (
          <button
            onClick={() => navigate(`/profile/${userId}`)}
            className="flex items-center gap-2 flex-1 hover:bg-accent/50 rounded-lg p-2 transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar} alt={profile.username} />
              <AvatarFallback>{profile.username[0]}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-semibold text-sm">{profile.username}</p>
              <p className="text-xs text-muted-foreground">
                История сообщений ({messages.length})
              </p>
            </div>
          </button>
        )}
      </header>

      <main className="flex-1 container mx-auto max-w-4xl p-4 overflow-y-auto">
        <Card className="p-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="MessageCircle" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Нет сообщений</p>
              <p className="text-sm text-muted-foreground mb-4">
                {profile?.username} ещё не отправлял сообщения в общий чат
              </p>
              <Button onClick={() => navigate('/')}>
                <Icon name="MessageCircle" size={16} className="mr-2" />
                Перейти в чат
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {messages.slice(-displayLimit).map((msg) => (
                  <div 
                    key={msg.id} 
                    className="flex gap-2 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <button onClick={() => navigate(`/profile/${msg.userId}`)}>
                      <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all h-10 w-10">
                        <AvatarImage src={msg.avatar} alt={msg.username} />
                        <AvatarFallback>{msg.username[0]}</AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <button 
                          onClick={() => navigate(`/profile/${msg.userId}`)}
                          className="font-semibold text-sm hover:text-purple-500 transition-colors"
                        >
                          {msg.username}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleString('ru-RU', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm break-words">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {displayLimit < messages.length && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDisplayLimit(displayLimit + 20)}
                  >
                    <Icon name="ChevronUp" size={16} className="mr-2" />
                    Показать больше
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
