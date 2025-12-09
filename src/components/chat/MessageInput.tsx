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

  const uploadVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!currentUserId) {
      toast.error('Необходимо войти в систему');
      return;
    }
    
    if (audioBlob.size === 0) {
      toast.error('Запись слишком короткая');
      return;
    }
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);
      
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
      await sendMessage(fileUrl, duration);
    } catch (error) {
      console.error('Error uploading voice:', error);
      toast.error('Ошибка загрузки голосового сообщения');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      audioStreamRef.current = stream;
      
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const duration = recordingTime;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        
        if (audioBlob.size > 0) {
          await uploadVoiceMessage(audioBlob, duration);
        }
        
        setRecordingTime(0);
        audioChunksRef.current = [];
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

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  };

  const preventContextMenu = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="bg-white border-t p-2"
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onContextMenu={preventContextMenu}
    >
      {isRecording ? (
        <div className="flex items-center gap-3 px-2">
          <button
            onClick={cancelRecording}
            className="text-sm text-muted-foreground"
          >
            Отмена
          </button>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-red-500 font-medium">{formatTime(recordingTime)}</span>
          </div>
          <button
            className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center select-none active:bg-blue-600"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onContextMenu={preventContextMenu}
            style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
          >
            <Icon name="Mic" size={24} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors">
            <Icon name="Smile" size={24} />
          </button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Сообщение"
              className="w-full rounded-full bg-secondary/30 border-0 pl-4 pr-4 h-10 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>

          <button className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors">
            <Icon name="Paperclip" size={22} />
          </button>
          
          {newMessage.trim() ? (
            <button
              onClick={() => sendMessage()}
              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors active:scale-95"
            >
              <Icon name="Send" size={20} />
            </button>
          ) : (
            <button
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onContextMenu={preventContextMenu}
              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors select-none active:scale-95"
              style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
            >
              <Icon name="Mic" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}