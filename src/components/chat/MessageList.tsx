import { useRef, useEffect } from 'react';
import VoiceMessage from './VoiceMessage';
import Icon from '@/components/ui/icon';

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
  imageUrl?: string | null;
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
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 bg-background">
      {messages.map((message) => {
        const isOwn = String(message.senderId) === String(currentUserId);
        
        return (
          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] md:max-w-md rounded-2xl px-3 py-2 shadow-sm ${
              isOwn 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}>
              {message.imageUrl ? (
                <div className="space-y-1">
                  <img 
                    src={message.imageUrl} 
                    alt="Прикрепленное изображение" 
                    className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.imageUrl!, '_blank')}
                  />
                  {message.text && <p className="text-sm whitespace-pre-wrap break-words mt-2">{message.text}</p>}
                </div>
              ) : message.voiceUrl ? (
                <VoiceMessage 
                  voiceUrl={message.voiceUrl} 
                  duration={message.voiceDuration || 0}
                  isOwn={isOwn}
                />
              ) : (
                message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
              )}
              
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOwn ? 'text-gray-500' : 'text-muted-foreground'}`}>
                <span>
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {isOwn && (
                  <div className="flex">
                    {message.isRead ? (
                      <>
                        <Icon name="Check" size={12} className="text-blue-400 -mr-1.5" />
                        <Icon name="Check" size={12} className="text-blue-400" />
                      </>
                    ) : (
                      <Icon name="Check" size={12} className="text-gray-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}