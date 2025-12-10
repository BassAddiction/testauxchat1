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
  const recordingTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = async (voiceUrl?: string, voiceDuration?: number, imageUrl?: string) => {
    if (!newMessage.trim() && !voiceUrl && !imageUrl) {
      return;
    }

    try {
      const content = newMessage.trim() || undefined;
      await api.sendMessage(currentUserId!, receiverId, content, voiceUrl, voiceDuration, imageUrl);
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
      console.log('[VOICE] Starting upload, blob size:', audioBlob.size, 'duration:', duration);
      
      // Получаем presigned URL от бэкенда
      const urlResponse = await fetch('https://functions.poehali.dev/559ff756-6b7f-42fc-8a61-2dac6de68639?contentType=audio/webm&extension=webm', {
        method: 'GET',
        headers: {
          'X-User-Id': currentUserId
        }
      });

      if (!urlResponse.ok) {
        toast.error('Не удалось получить URL для загрузки');
        return;
      }

      const { uploadUrl, fileUrl } = await urlResponse.json();
      console.log('[VOICE] Got presigned URL, uploading directly to S3...');
      
      // Загружаем напрямую в S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/webm'
        },
        body: audioBlob
      });

      console.log('[VOICE] S3 upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        console.error('[VOICE] S3 upload failed:', uploadResponse.status);
        toast.error(`Ошибка загрузки: ${uploadResponse.status}`);
        return;
      }

      console.log('[VOICE] Upload success, file URL:', fileUrl);
      await sendMessage(fileUrl, duration);
    } catch (error) {
      console.error('[VOICE] Error uploading voice:', error);
      toast.error(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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
        const duration = recordingTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        
        if (audioBlob.size > 0) {
          await uploadVoiceMessage(audioBlob, duration);
        }
        
        setRecordingTime(0);
        recordingTimeRef.current = 0;
        audioChunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      
      recordingIntervalRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
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
      recordingTimeRef.current = 0;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStartRecording = () => {
    startRecording();
  };

  const handleSendRecording = () => {
    stopRecording();
  };

  const preventContextMenu = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 10 МБ');
      return;
    }

    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const contentType = file.type;

      const urlResponse = await fetch(`https://functions.poehali.dev/559ff756-6b7f-42fc-8a61-2dac6de68639?contentType=${contentType}&extension=${extension}`, {
        method: 'GET',
        headers: {
          'X-User-Id': currentUserId!
        }
      });

      if (!urlResponse.ok) {
        toast.error('Не удалось получить URL для загрузки');
        return;
      }

      const { uploadUrl, fileUrl } = await urlResponse.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: file
      });

      if (!uploadResponse.ok) {
        toast.error('Ошибка загрузки изображения');
        return;
      }

      await sendMessage(undefined, undefined, fileUrl);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Не удалось загрузить изображение');
    }
  };

  return (
    <div 
      className="bg-white border-t p-2"
      onContextMenu={preventContextMenu}
    >
      {isRecording ? (
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1 flex items-center gap-2 bg-red-50 rounded-full px-4 py-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-red-500 font-medium">{formatTime(recordingTime)}</span>
          </div>
          
          <button
            onClick={cancelRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <Icon name="X" size={22} />
          </button>
          
          <button
            onClick={handleSendRecording}
            className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors active:scale-95"
          >
            <Icon name="Send" size={20} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <Icon name="Smile" size={24} />
          </button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Сообщение"
              className="w-full rounded-full bg-gray-100 border-0 pl-4 pr-4 h-10 focus-visible:ring-0 focus-visible:bg-gray-100"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
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
              onClick={handleStartRecording}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <Icon name="Mic" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}