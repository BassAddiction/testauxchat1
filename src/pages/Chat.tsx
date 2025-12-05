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
      
      // Инициализируем счётчик при первой загрузке
      if (lastMessageCountRef.current === 0) {
        lastMessageCountRef.current = newMessages.length;
      } else if (newMessages.length > lastMessageCountRef.current) {
        // Проверяем новые входящие сообщения
        const latestMessage = newMessages[newMessages.length - 1];
        // Если последнее сообщение от собеседника (не от нас)
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
      const body: any = {
        receiverId: Number(userId)
      };
      
      if (voiceUrl) {
        body.voiceUrl = voiceUrl;
        body.voiceDuration = voiceDuration;
        console.log('sendMessage: voice message', body);
      }
      
      if (newMessage.trim()) {
        body.text = newMessage;
        console.log('sendMessage: text message', body);
      }

      console.log('Sending POST request with body:', JSON.stringify(body));

      const response = await fetch(
        'https://functions.poehali.dev/0222e582-5c06-4780-85fa-c9145e5bba14',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId || '0'
          },
          body: JSON.stringify(body)
        }
      );

      console.log('Response status:', response.status);

      if (response.ok) {
        console.log('Message sent successfully');
        setNewMessage('');
        loadMessages();
      } else {
        const data = await response.json();
        console.error('Send message failed:', response.status, data);
        if (response.status === 403) {
          toast.error('Вы не можете отправлять сообщения этому пользователю', {
            description: 'Один из вас заблокировал другого'
          });
        } else {
          toast.error(data.error || 'Ошибка отправки сообщения');
        }
      }
    } catch (error) {
      console.error('sendMessage error:', error);
      toast.error('Ошибка отправки сообщения: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startRecording = async () => {
    console.log('🎤 Starting recording...');
    try {
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎤 Microphone access granted!');
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      console.log('🎤 MediaRecorder created, mime:', recorder.mimeType);

      recorder.ondataavailable = (e) => {
        console.log('🎤 Data available, size:', e.data.size);
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      console.log('🎤 Recording started!');
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('❌ Recording error:', error);
      toast.error('Нет доступа к микрофону: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        console.log('🛑 Recorder stopped, chunks:', audioChunksRef.current.length);
        const mimeType = recorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('🛑 Created blob, size:', audioBlob.size, 'type:', audioBlob.type);
        await uploadVoiceMessage(audioBlob);
        
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      };
      
      recorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const uploadVoiceMessage = async (audioBlob: Blob) => {
    const duration = recordingTime;
    setRecordingTime(0);
    
    try {
      console.log('Uploading voice, size:', audioBlob.size, 'type:', audioBlob.type, 'duration:', duration);
      
      if (audioBlob.size === 0) {
        console.error('Audio blob is empty');
        toast.error('Запись пуста, попробуйте еще раз');
        return;
      }
      
      if (audioBlob.size < 100) {
        console.error('Audio blob too small:', audioBlob.size);
        toast.error('Слишком короткая запись');
        return;
      }
      
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4';
      const contentType = audioBlob.type || 'audio/webm';
      
      console.log('Step 1: Getting pre-signed URL...');
      const urlResponse = await fetch(
        `https://functions.poehali.dev/559ff756-6b7f-42fc-8a61-2dac6de68639?contentType=${encodeURIComponent(contentType)}&extension=${extension}`
      );
      
      if (!urlResponse.ok) {
        console.error('Failed to get upload URL:', urlResponse.status);
        toast.error('Ошибка получения ссылки для загрузки');
        return;
      }
      
      const { uploadUrl, fileUrl } = await urlResponse.json();
      console.log('Got upload URL, uploading file...');
      
      console.log('Step 2: Uploading to S3 with pre-signed URL...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: audioBlob
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorText);
        toast.error('Ошибка загрузки файла');
        return;
      }

      console.log('Upload successful, URL:', fileUrl);
      
      console.log('Step 3: Sending message with voiceUrl:', fileUrl, 'duration:', duration);
      await sendMessage(fileUrl, duration);
    } catch (error) {
      console.error('Upload voice error:', error);
      toast.error('Ошибка отправки голосового: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkBlockStatus = async () => {
    try {
      const response = await fetch(
        'https://functions.poehali.dev/7d7db6d4-88e3-4f83-8ad5-9fc30ccfd5bf',
        {
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      const data = await response.json();
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
        const response = await fetch(
          `https://functions.poehali.dev/7d7db6d4-88e3-4f83-8ad5-9fc30ccfd5bf?blockedUserId=${userId}`,
          {
            method: 'DELETE',
            headers: { 'X-User-Id': currentUserId || '0' }
          }
        );
        if (response.ok) {
          setIsBlocked(false);
          toast.success('Пользователь разблокирован');
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
            body: JSON.stringify({ blockedUserId: Number(userId) })
          }
        );
        if (response.ok) {
          setIsBlocked(true);
          toast.success('Пользователь заблокирован');
        }
      }
    } catch (error) {
      toast.error('Ошибка при изменении статуса блокировки');
    } finally {
      setCheckingBlock(false);
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
            <>
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
              <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-9 w-9"
                  >
                    <Icon name="MoreVertical" size={18} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Действия</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Button
                      variant={isBlocked ? "outline" : "destructive"}
                      className="w-full justify-start"
                      onClick={() => {
                        handleBlockToggle();
                        setMenuOpen(false);
                      }}
                      disabled={checkingBlock}
                    >
                      {checkingBlock ? (
                        <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Icon name={isBlocked ? "UserCheck" : "Ban"} size={16} className="mr-2" />
                      )}
                      {isBlocked ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 container mx-auto max-w-4xl px-2 md:px-4 py-3 md:py-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 md:gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl md:text-2xl">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile?.username[0]?.toUpperCase()
              )}
            </div>
            <p className="text-muted-foreground text-center px-4 text-sm md:text-base">Нет сообщений. Начните диалог!</p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-4">
            {messages.map((message) => {
              const isOwn = String(message.senderId) === String(currentUserId);
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%] md:max-w-[70%]">
                    <Card className={`p-2.5 md:p-3 ${
                      isOwn
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-card'
                    }`}>
                      {message.voiceUrl ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon name="Mic" size={16} className={isOwn ? "text-purple-100" : "text-purple-500"} />
                            <span className="text-xs">Голосовое сообщение</span>
                            {message.voiceDuration && (
                              <span className="text-xs opacity-70">({formatTime(message.voiceDuration)})</span>
                            )}
                          </div>
                          <audio 
                            controls 
                            className="w-full max-w-xs h-8"
                            style={{
                              filter: isOwn ? 'invert(1) brightness(1.5)' : 'none'
                            }}
                          >
                            <source src={message.voiceUrl} type="audio/webm" />
                            <source src={message.voiceUrl} type="audio/mp4" />
                          </audio>
                        </div>
                      ) : (
                        <p className="break-words text-xs md:text-sm leading-relaxed">{message.text}</p>
                      )}
                      <div className={`flex items-center justify-between gap-2 text-[10px] md:text-xs mt-0.5 md:mt-1 ${
                        isOwn ? 'text-purple-100' : 'text-muted-foreground'
                      }`}>
                        <span>
                          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isOwn && (
                          <span className="flex items-center gap-0.5">
                            {message.isRead ? (
                              <>
                                <Icon name="CheckCheck" size={12} className="text-blue-200" />
                              </>
                            ) : (
                              <Icon name="Check" size={12} className="text-purple-200" />
                            )}
                          </span>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-card/90 backdrop-blur border-t border-purple-500/20 p-2 md:p-4">
        <div className="container mx-auto max-w-4xl">
          {isRecording ? (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl border-2 border-red-200">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600">Запись... {formatTime(recordingTime)}</span>
              </div>
              <Button
                onClick={cancelRecording}
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-red-100"
              >
                <Icon name="X" size={20} className="text-red-600" />
              </Button>
              <Button
                onClick={stopRecording}
                className="h-9 px-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Icon name="Send" size={16} className="mr-2" />
                Отправить
              </Button>
            </div>
          ) : (
            <div className="relative flex items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Написать сообщение..."
                className="flex-1 pl-3 md:pl-4 pr-20 md:pr-24 py-2.5 md:py-3 rounded-3xl border-2 border-gray-200 bg-gray-50 resize-none focus:outline-none focus:border-purple-400 focus:bg-white text-sm md:text-base transition-all"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <div className="absolute right-1 md:right-1.5 bottom-1 md:bottom-1.5 flex items-center gap-1">
                {!newMessage.trim() && (
                  <Button
                    onClick={startRecording}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-purple-100"
                  >
                    <Icon name="Mic" size={18} className="text-purple-600" />
                  </Button>
                )}
                <Button
                  onClick={() => sendMessage()}
                  disabled={!newMessage.trim()}
                  className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <Icon name="Send" size={16} className="ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}