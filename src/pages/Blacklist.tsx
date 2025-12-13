import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { FUNCTIONS } from '@/lib/func2url';

interface BlockedUser {
  userId: number;
  username: string;
}

export default function Blacklist() {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentUserId = localStorage.getItem('auxchat_user_id');

  useEffect(() => {
    if (!currentUserId) {
      navigate('/');
      return;
    }
    loadBlacklist();
  }, []);

  const loadBlacklist = async () => {
    try {
      // FUNCTION: blacklist - Получение списка заблокированных пользователей (GET)
      const response = await fetch(
        FUNCTIONS['blacklist'],
        {
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      const data = await response.json();
      setBlockedUsers(data.blockedUsers || []);
    } catch (error) {
      console.error('Error loading blacklist:', error);
      toast.error('Ошибка загрузки черного списка');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      // FUNCTION: blacklist - Разблокировка пользователя (DELETE)
      const response = await fetch(
        `${FUNCTIONS['blacklist']}?blockedUserId=${userId}`,
        {
          method: 'DELETE',
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      
      if (response.ok) {
        setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
        toast.success('Пользователь разблокирован');
      }
    } catch (error) {
      console.error('Unblock error:', error);
      toast.error('Ошибка разблокировки');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-2 md:px-3 py-2 flex items-center gap-2 md:gap-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="h-8 w-8 p-0"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
        <div className="flex items-center gap-2">
          <Icon name="Ban" className="text-red-500" size={24} />
          <h1 className="text-lg md:text-xl font-bold text-red-500">Черный список</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-2xl p-2 md:p-4">
        <Card className="p-3 md:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-purple-500" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Ban" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Черный список пуст</p>
              <p className="text-sm text-muted-foreground mb-4">
                Заблокированные пользователи не смогут отправлять вам личные сообщения
              </p>
              <Button onClick={() => navigate('/')}>
                <Icon name="MessageCircle" size={16} className="mr-2" />
                Перейти в чат
              </Button>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {blockedUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white hover:bg-red-50 transition-colors"
                >
                  <button
                    onClick={() => navigate(`/profile/${user.userId}`)}
                    className="flex items-center gap-2 md:gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-10 w-10 md:h-12 md:w-12 flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt={user.username} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Заблокирован</p>
                    </div>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(user.userId)}
                    className="h-8 md:h-9 w-8 md:w-9 p-0 flex-shrink-0"
                    title="Разблокировать"
                  >
                    <Icon name="UserCheck" size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}