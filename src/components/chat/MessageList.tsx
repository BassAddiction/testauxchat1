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
    <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1.5 bg-background">
      {messages.map((message) => {
        const isOwn = String(message.senderId) === String(currentUserId);
        
        return (
          <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-md rounded-2xl px-3 py-2 shadow-sm ${
              isOwn 
                ? 'bg-purple-100 text-gray-900 rounded-br-sm' 
                : 'bg-card rounded-bl-sm'
            }`}>
              {message.voiceUrl ? (
                <VoiceMessage 
                  voiceUrl={message.voiceUrl} 
                  duration={message.voiceDuration || 0}
                  isOwn={isOwn}
                />
              ) : (
                message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
              )}
              
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isOwn ? 'text-purple-100' : 'text-muted-foreground'}`}>
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
                        <Icon name="Check" size={12} className="text-blue-300 -mr-1.5" />
                        <Icon name="Check" size={12} className="text-blue-300" />
                      </>
                    ) : (
                      <Icon name="Check" size={12} className="text-purple-200" />
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