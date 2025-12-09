import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface MessageInputProps {
  currentUserId: string | null;
  receiverId: number;
  onMessageSent: () => void;
}

export default function MessageInput({
  currentUserId,
  receiverId,
  onMessageSent,
}: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = async (voiceUrl?: string, voiceDuration?: number) => {
    if (!newMessage.trim() && !voiceUrl) {
      return;
    }

    try {
      const content = newMessage.trim() || undefined;
      await api.sendMessage(currentUserId!, receiverId, content, voiceUrl, voiceDuration);
      setNewMessage('');
      onMessageSent();
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

  const uploadVoiceMessage = async (audioBlob: Blob) => {
    if (!currentUserId) {
      toast.error('Необходимо войти в систему');
      return;
    }
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const uploadResponse = await fetch('https://functions.poehali.dev/559ff756-6b7f-42fc-8a61-2dac6de68639', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId
        },
        body: JSON.stringify({ 
          audioData: base64,
          contentType: 'audio/webm'
        })
      });

      if (!uploadResponse.ok) {
        toast.error('Ошибка загрузки голосового сообщения');
        return;
      }

      const { fileUrl } = await uploadResponse.json();
      await sendMessage(fileUrl, recordingTime);
    } catch (error) {
      console.error('Error uploading voice:', error);
      toast.error('Ошибка загрузки голосового сообщения');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMouseDown = () => {
    startRecording();
  };

  const handleMouseUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const handleTouchStart = () => {
    startRecording();
  };

  const handleTouchEnd = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <div 
      className="bg-background border-t p-3 md:p-4"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
    >
      {isRecording ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 bg-red-500/10 rounded-full px-4 py-2.5">
            <button
              className="w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <Icon name="Mic" size={20} />
            </button>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
            <span className="font-mono text-sm font-medium">{formatTime(recordingTime)}</span>
            <span className="text-xs text-muted-foreground">Отпустите</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Сообщение"
              className="w-full rounded-full bg-secondary/50 border-0 pl-4 pr-20 h-11 focus-visible:ring-1 focus-visible:ring-purple-500"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {newMessage.trim() ? (
                <button
                  onClick={() => sendMessage()}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Icon name="Send" size={18} />
                </button>
              ) : (
                <>
                  <button
                    className="w-9 h-9 rounded-full hover:bg-accent/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="Paperclip" size={20} />
                  </button>
                  <button
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className="w-9 h-9 rounded-full hover:bg-accent/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:bg-red-500/20"
                  >
                    <Icon name="Mic" size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}