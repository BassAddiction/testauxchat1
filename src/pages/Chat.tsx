import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

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
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const currentUserId = localStorage.getItem('auxchat_user_id');
  const currentUsername = localStorage.getItem('username') || 'Я';

  const updateActivity = async () => {
    try {
      await api.updateActivity(currentUserId!);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProfile = async () => {
    try {
      const data = await api.getUser(userId!);
      const photosData = await api.getProfilePhotos(userId!);
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
      const data = await api.getUser(currentUserId!);
      const photosData = await api.getProfilePhotos(currentUserId!);
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
      const data = await api.getConversationMessages(userId!, currentUserId!);
      const newMessages = data.messages || [];
      
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
        lastMessageCountRef.current = newMessages.length;
      }
      
      setMessages(newMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (voiceUrl?: string, voiceDuration?: number) => {
    if (!newMessage.trim() && !voiceUrl) {
      console.log('sendMessage: no message and no voice');
      return;
    }

    try {
      const content = newMessage.trim() || undefined;
      await api.sendMessage(currentUserId!, Number(userId), content, voiceUrl, voiceDuration);
      console.log('Message sent successfully');
      setNewMessage('');
      loadMessages();
    } catch (error: any) {
      console.error('Send message failed:', error);
      if (error.message?.includes('заблокирован')) {
        toast.error('Вы не можете отправлять сообщения этому пользователю', {
          description: 'Один из вас заблокировал другого'
        });
      } else {
        toast.error(error.message || 'Не удалось отправить сообщение');
      }
    }
  };

  const checkBlockStatus = async () => {
    try {
      const data = await api.checkBlockStatus(currentUserId!, Number(userId));
      const blocked = data.blockedUsers?.some((u: any) => String(u.userId) === String(userId));
      setIsBlocked(blocked);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const handleBlockToggle = async () => {
    setCheckingBlock(true);
    try {
      if (isBlocked) {
        await api.unblockUser(currentUserId!, Number(userId));
        setIsBlocked(false);
        toast.success('Пользователь разблокирован');
      } else {
        await api.blockUser(currentUserId!, Number(userId));
        setIsBlocked(true);
        toast.success('Пользователь заблокирован');
      }
    } catch (error) {
      toast.error('Ошибка при изменении статуса блокировки');
    } finally {
      setCheckingBlock(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceMessage(audioBlob);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Не удалось начать запись. Проверьте доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setRecordingTime(0);
    }
  };

  const uploadVoiceMessage = async (audioBlob: Blob) => {
    try {
      const extension = 'webm';
      const { uploadUrl, fileUrl } = await api.getUploadUrl('audio/webm', extension);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' }
      });

      if (!uploadResponse.ok) {
        toast.error('Ошибка загрузки голосового сообщения');
        return;
      }

      await sendMessage(fileUrl, recordingTime);
    } catch (error) {
      console.error('Error uploading voice:', error);
      toast.error('Ошибка загрузки голосового сообщения');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-purple-950/20 to-background">
      <div className="bg-card/80 backdrop-blur border-b border-purple-500/20 p-3 md:p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="h-8 w-8 p-0"
        >
          <Icon name="ArrowLeft" size={20} />
        </Button>
        
        <button
          onClick={() => navigate(`/profile/${userId}`)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile?.username[0]?.toUpperCase()
            )}
          </div>
          <div className="text-left">
            <h2 className="font-bold text-sm md:text-base">{profile?.username}</h2>
            <span className={`text-xs ${profile?.status === 'online' ? 'text-green-400' : 'text-muted-foreground'}`}>
              {profile?.status === 'online' ? 'Онлайн' : 'Не в сети'}
            </span>
          </div>
        </button>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Icon name="MoreVertical" size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Действия</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  navigate(`/profile/${userId}`);
                  setMenuOpen(false);
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <Icon name="User" size={16} className="mr-2" />
                Профиль
              </Button>
              <Button
                onClick={() => {
                  handleBlockToggle();
                  setMenuOpen(false);
                }}
                disabled={checkingBlock}
                variant={isBlocked ? "outline" : "destructive"}
                className="w-full justify-start"
              >
                {checkingBlock ? (
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                ) : (
                  <Icon name={isBlocked ? "UserCheck" : "UserX"} size={16} className="mr-2" />
                )}
                {isBlocked ? 'Разблокировать' : 'Заблокировать'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3">
        {messages.map((message) => {
          const isOwn = String(message.senderId) === String(currentUserId);
          const messageProfile = isOwn ? currentUserProfile : profile;
          
          return (
            <div key={message.id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {messageProfile?.avatar ? (
                    <img src={messageProfile.avatar} alt={messageProfile.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    messageProfile?.username[0]?.toUpperCase()
                  )}
                </div>
              )}
              
              <Card className={`max-w-[75%] md:max-w-md p-2 md:p-3 ${
                isOwn 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                  : 'bg-card'
              }`}>
                {message.voiceUrl && (
                  <div className="mb-2">
                    <audio controls className="w-full" style={{ maxWidth: '300px' }}>
                      <source src={message.voiceUrl} type="audio/webm" />
                      <source src={message.voiceUrl} type="audio/ogg" />
                      <source src={message.voiceUrl} type="audio/mp4" />
                      Ваш браузер не поддерживает аудио
                    </audio>
                    {message.voiceDuration && (
                      <p className="text-xs mt-1 opacity-70">
                        Длительность: {formatTime(message.voiceDuration)}
                      </p>
                    )}
                  </div>
                )}
                {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-purple-100' : 'text-muted-foreground'}`}>
                  {new Date(message.createdAt).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </Card>
              
              {isOwn && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {messageProfile?.avatar ? (
                    <img src={messageProfile.avatar} alt={messageProfile.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    messageProfile?.username[0]?.toUpperCase()
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card/80 backdrop-blur border-t border-purple-500/20 p-2 md:p-4">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 bg-red-500/20 rounded-lg px-4 py-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            </div>
            <Button
              onClick={cancelRecording}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0"
            >
              <Icon name="X" size={20} />
            </Button>
            <Button
              onClick={stopRecording}
              className="h-10 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Icon name="Send" size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={startRecording}
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0"
            >
              <Icon name="Mic" size={18} />
            </Button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Сообщение..."
              className="flex-1 px-3 md:px-4 py-2 text-sm bg-background/50 border border-purple-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!newMessage.trim()}
              className="h-10 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Icon name="Send" size={18} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
