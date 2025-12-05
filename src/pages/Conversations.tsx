import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Conversation {
  userId: number;
  username: string;
  avatarUrl: string | null;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function Conversations() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUnreadCountRef = useRef(0);

  const currentUserId = localStorage.getItem('auxchat_user_id');

  const updateActivity = async () => {
    try {
      await fetch('https://functions.poehali.dev/a70b420b-cb23-4948-9a56-b8cefc96f976', {
        method: 'POST',
        headers: { 'X-User-Id': currentUserId || '0' }
      });
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      navigate('/');
      return;
    }
    updateActivity();
    loadConversations();
    const conversationsInterval = setInterval(loadConversations, 5000);
    const activityInterval = setInterval(updateActivity, 60000);
    return () => {
      clearInterval(conversationsInterval);
      clearInterval(activityInterval);
    };
  }, []);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(
        'https://functions.poehali.dev/aea3125a-7d11-4637-af71-0998dfbaf5b2',
        {
          headers: {
            'X-User-Id': currentUserId || '0'
          }
        }
      );
      const data = await response.json();
      const newConversations = data.conversations || [];
      
      // Считаем общее количество непрочитанных
      const totalUnread = newConversations.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0);
      
      // Инициализируем счётчик при первой загрузке
      if (prevUnreadCountRef.current === 0) {
        prevUnreadCountRef.current = totalUnread;
      } else if (totalUnread > prevUnreadCountRef.current) {
        // Если появились новые непрочитанные
        playNotificationSound();
        const newMessages = totalUnread - prevUnreadCountRef.current;
        toast.info('Новое личное сообщение', {
          description: `У вас ${newMessages} ${newMessages === 1 ? 'непрочитанное сообщение' : 'непрочитанных сообщения'}`
        });
        prevUnreadCountRef.current = totalUnread;
      }
      
      setConversations(newConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (userId: number) => {
    navigate(`/chat/${userId}`);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/20 to-background">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Сообщения</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 md:h-10"
          >
            <Icon name="ArrowLeft" size={18} className="mr-1 md:mr-2" />
            <span className="hidden sm:inline">Назад в чат</span>
            <span className="sm:hidden">Назад</span>
          </Button>
        </div>

        {conversations.length === 0 ? (
          <Card className="p-8 text-center bg-card/90 backdrop-blur border-purple-500/20">
            <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              У вас пока нет личных сообщений.
              <br />
              Начните диалог, перейдя в профиль пользователя.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card
                key={conv.userId}
                className="p-3 md:p-4 bg-card/90 backdrop-blur border-purple-500/20 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => openChat(conv.userId)}
              >
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg md:text-xl font-bold flex-shrink-0 relative">
                    {conv.avatarUrl ? (
                      <img src={conv.avatarUrl} alt={conv.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      conv.username[0]?.toUpperCase()
                    )}
                    {conv.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-background"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 md:mb-1">
                      <h3 className="font-semibold text-sm md:text-base truncate">{conv.username}</h3>
                      <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(conv.lastMessageAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs md:text-sm text-muted-foreground truncate flex-1">
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 px-1.5 md:px-2 py-0.5 md:py-1 bg-purple-500 text-white text-[10px] md:text-xs rounded-full flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <Icon name="ChevronRight" size={18} className="text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}