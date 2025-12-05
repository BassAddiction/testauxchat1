import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface MessageInputProps {
  currentUserId: string | null;
  onMessageSent: () => void;
}

export default function MessageInput({
  currentUserId,
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
      await api.sendMessage(currentUserId!, 0, content, voiceUrl, voiceDuration);
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
    try {
      // Upload через бэкенд (обход CORS)
      const uploadResponse = await fetch(API.uploadUrl, {
        method: 'POST',
        body: audioBlob,
        headers: { 'Content-Type': 'audio/webm' }
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

  return (
    <div className="bg-card/80 backdrop-blur border-t border-purple-500/20 p-2 md:p-4">
      {isRecording ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 bg-red-500/20 rounded-lg px-4 py-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
            <span className="text-xs text-muted-foreground">Запись голосового сообщения...</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelRecording}
            className="h-10 w-10 p-0"
          >
            <Icon name="X" size={20} />
          </Button>
          <Button
            size="sm"
            onClick={stopRecording}
            className="h-10 px-4 bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Icon name="Send" size={18} />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={startRecording}
            className="h-10 w-10 p-0"
          >
            <Icon name="Mic" size={20} />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Сообщение..."
            className="flex-1 bg-background/50"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim()}
            size="sm"
            className="h-10 px-4 bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Icon name="Send" size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}