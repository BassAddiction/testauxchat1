import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { FUNCTIONS } from '@/lib/func2url';

interface SubscribedUser {
  id: number;
  username: string;
  avatar: string;
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const [subscribedUsers, setSubscribedUsers] = useState<SubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUserId = localStorage.getItem('auxchat_user_id');

  useEffect(() => {
    if (!currentUserId) {
      navigate('/');
      return;
    }
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      // FUNCTION: get-subscriptions - Получение ID пользователей, на которых подписан
      const response = await fetch(
        FUNCTIONS["get-subscriptions"],
        {
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      const data = await response.json();
      const userIds = data.subscribedUserIds || [];
      
      const usersPromises = userIds.map(async (id: number) => {
        // FUNCTION: get-user - Получение данных пользователя
        const userResponse = await fetch(
          `${FUNCTIONS["get-user"]}?user_id=${id}`
        );
        const userData = await userResponse.json();
        
        // FUNCTION: profile-photos - Получение фотографий для аватара
        const photosResponse = await fetch(
          `${FUNCTIONS["profile-photos"]}?userId=${id}`,
          {
            headers: { 'X-User-Id': currentUserId || '0' }
          }
        );
        const photosData = await photosResponse.json();
        const avatar = photosData.photos && photosData.photos.length > 0 
          ? photosData.photos[0].url 
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`;
        
        return {
          id: userData.id,
          username: userData.username,
          avatar
        };
      });
      
      const users = await Promise.all(usersPromises);
      setSubscribedUsers(users);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (userId: number) => {
    try {
      // FUNCTION: subscribe - Отписка от пользователя (DELETE)
      const response = await fetch(
        `${FUNCTIONS["subscribe"]}?targetUserId=${userId}`,
        {
          method: 'DELETE',
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      
      if (response.ok) {
        setSubscribedUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-3 py-2 flex items-center gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="h-8 w-8 p-0"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
        <div className="flex items-center gap-2">
          <Icon name="Users" className="text-red-500" size={24} />
          <h1 className="text-xl font-bold text-red-500">Отслеживаю</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-2xl p-4">
        <Card className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-purple-500" />
            </div>
          ) : subscribedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Вы ни на кого не подписаны</p>
              <p className="text-sm text-muted-foreground mb-4">
                Подпишитесь на пользователей в общем чате, чтобы следить за их сообщениями
              </p>
              <Button onClick={() => navigate('/')}>
                <Icon name="MessageCircle" size={16} className="mr-2" />
                Перейти в чат
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {subscribedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white hover:bg-purple-50 transition-colors"
                >
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="font-semibold truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Вы подписаны</p>
                    </div>
                  </button>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/user-messages/${user.id}`)}
                      className="h-9 w-9 p-0"
                      title="Все сообщения"
                    >
                      <Icon name="MessageSquare" size={18} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnsubscribe(user.id)}
                      className="h-9 w-9 p-0"
                      title="Отписаться"
                    >
                      <Icon name="UserMinus" size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}