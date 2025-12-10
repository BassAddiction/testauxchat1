import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';

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
  voiceUrl?: string | null;
  voiceDuration?: number | null;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastMessageCountRef = useRef(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    updateActivity();
    loadProfile();
    loadCurrentUserProfile();
    loadMessages();
    checkBlockStatus();
    const messagesInterval = setInterval(loadMessages, 3000);
    const profileInterval = setInterval(loadProfile, 10000);
    const activityInterval = setInterval(updateActivity, 60000);
    return () => {
      clearInterval(messagesInterval);
      clearInterval(profileInterval);
      clearInterval(activityInterval);
    };
  }, [userId]);

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
      const newMessages = data.messages || [];
      
      console.log('[CHAT] Loaded messages:', newMessages.length, 'previous:', lastMessageCountRef.current);
      
      if (lastMessageCountRef.current === 0) {
        lastMessageCountRef.current = newMessages.length;
      } else if (newMessages.length > lastMessageCountRef.current) {
        const latestMessage = newMessages[newMessages.length - 1];
        if (String(latestMessage.senderId) !== String(currentUserId)) {
          playNotificationSound();
          toast.info(`Новое сообщение от ${profile?.username || 'пользователя'}`, {
            description: latestMessage.text.slice(0, 50) + (latestMessage.text.length > 50 ? '...' : '')
          });
        }
      }
      
      // Всегда обновляем счётчик и сообщения
      lastMessageCountRef.current = newMessages.length;
      setMessages(newMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBlockStatus = async () => {
    setCheckingBlock(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/7d7db6d4-88e3-4f83-8ad5-9fc30ccfd5bf?targetUserId=${userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId || '0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsBlocked(data.isBlocked || false);
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setCheckingBlock(false);
    }
  };

  const handleBlockToggle = async () => {
    setCheckingBlock(true);
    try {
      if (isBlocked) {
        const response = await fetch(
          `https://functions.poehali.dev/7d7db6d4-88e3-4f83-8ad5-9fc30ccfd5bf?targetUserId=${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': currentUserId || '0'
            }
          }
        );
        
        if (response.ok) {
          setIsBlocked(false);
          toast.success('Пользователь разблокирован');
          setMenuOpen(false);
        } else {
          toast.error('Не удалось разблокировать пользователя');
        }
      } else {
        const response = await fetch(
          'https://functions.poehali.dev/7d7db6d4-88e3-4f83-8ad5-9fc30ccfd5bf',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': currentUserId || '0'
            },
            body: JSON.stringify({ user_id: Number(userId) })
          }
        );
        
        if (response.ok) {
          setIsBlocked(true);
          toast.success('Пользователь заблокирован');
          setMenuOpen(false);
        } else {
          toast.error('Не удалось заблокировать пользователя');
        }
      }
    } catch (error) {
      console.error('Error toggling block:', error);
      toast.error('Произошла ошибка');
    } finally {
      setCheckingBlock(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex flex-col">
      <div className="sticky top-0 z-10 flex-shrink-0">
        <ChatHeader
          profile={profile}
          userId={userId}
          isBlocked={isBlocked}
          checkingBlock={checkingBlock}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onBack={() => navigate('/')}
          onProfileClick={() => navigate(`/profile/${userId}`)}
          onBlockToggle={handleBlockToggle}
        />
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-card/50 backdrop-blur max-w-4xl mx-auto w-full">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            currentUserProfile={currentUserProfile}
            profile={profile}
          />
          
          <MessageInput
            currentUserId={currentUserId}
            receiverId={Number(userId)}
            onMessageSent={loadMessages}
          />
        </div>
      </main>
    </div>
  );
}