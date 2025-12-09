import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface VoiceMessageProps {
  voiceUrl: string;
  duration: number;
  isOwn: boolean;
}

export default function VoiceMessage({ voiceUrl, duration, isOwn }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio ref={audioRef} src={voiceUrl} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOwn 
            ? 'bg-purple-500 text-white hover:bg-purple-600' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isPlaying ? (
          <Icon name="Pause" size={18} />
        ) : (
          <Icon name="Play" size={18} className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-2">
        <div className="relative h-1 bg-gray-200/50 rounded-full overflow-hidden">
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              isOwn ? 'bg-purple-500' : 'bg-blue-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className={`flex items-center justify-between text-xs font-mono ${isOwn ? 'text-gray-700' : 'text-muted-foreground'}`}>
          <span>{formatTime(currentTime)}</span>
          <span className="opacity-70">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}