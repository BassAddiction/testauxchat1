import { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null;
  currentUserProfile: UserProfile | null;
  profile: UserProfile | null;
}

export default function MessageList({
  messages,
  currentUserId,
  currentUserProfile,
  profile,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3">
      {messages.map((message) => {
        const isOwn = String(message.senderId) === String(currentUserId);
        
        return (
          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}