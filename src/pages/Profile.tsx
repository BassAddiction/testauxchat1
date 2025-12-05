import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface UserProfile {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  status: string;
  energy: number;
}

interface Photo {
  id: number;
  url: string;
  created_at: string;
}

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);

  const currentUserId = localStorage.getItem('auxchat_user_id');
  const isOwnProfile = String(currentUserId) === String(userId);

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
    if (!currentUserId) {
      navigate('/');
      return;
    }
    updateActivity();
    loadProfile();
    loadPhotos();
    if (!isOwnProfile) {
      checkBlockStatus();
    }
    const activityInterval = setInterval(updateActivity, 60000);
    return () => clearInterval(activityInterval);
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${userId}`
      );
      const data = await response.json();
      
      const photosResponse = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
        {
          headers: { 'X-User-Id': currentUserId || '0' }
        }
      );
      const photosData = await photosResponse.json();
      const userAvatar = photosData.photos && photosData.photos.length > 0 
        ? photosData.photos[0].url 
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;
      
      setProfile({ ...data, avatar: userAvatar });
    } catch (error) {
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
        {
          headers: {
            'X-User-Id': currentUserId || '0'
          }
        }
      );
      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const addPhoto = async () => {
    if (!photoUrl.trim()) return;

    setIsAddingPhoto(true);
    try {
      const response = await fetch(
        'https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId || '0'
          },
          body: JSON.stringify({ photoUrl })
        }
      );

      if (response.ok) {
        toast.success('Фото добавлено');
        setPhotoUrl('');
        loadPhotos();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Ошибка добавления фото');
      }
    } catch (error) {
      toast.error('Ошибка добавления фото');
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const deletePhoto = async (photoId: number) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?photoId=${photoId}`,
        {
          method: 'DELETE',
          headers: {
            'X-User-Id': currentUserId || '0'
          }
        }
      );

      if (response.ok) {
        toast.success('Фото удалено');
        loadPhotos();
      }
    } catch (error) {
      toast.error('Ошибка удаления фото');
    }
  };

  const openChat = () => {
    navigate(`/chat/${userId}`);
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

  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!viewerOpen) return;
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'Escape') setViewerOpen(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, photos.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 10 МБ');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('https://poehali.dev/api/upload-to-s3', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        toast.error('Ошибка загрузки фото');
        setUploadingFile(false);
        return;
      }

      const { url } = await uploadResponse.json();

      const addPhotoResponse = await fetch(
        'https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId || '0'
          },
          body: JSON.stringify({ photoUrl: url })
        }
      );

      if (addPhotoResponse.ok) {
        toast.success('Фото добавлено');
        loadPhotos();
      } else {
        const error = await addPhotoResponse.json();
        toast.error(error.error || 'Ошибка добавления фото');
      }
    } catch (error) {
      toast.error('Ошибка загрузки фото');
    } finally {
      setUploadingFile(false);
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Профиль не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/20 to-background">
      <div className="container mx-auto px-2 md:px-4 py-3 md:py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-2 md:mb-3 h-8 md:h-9 px-2"
        >
          <Icon name="ArrowLeft" size={18} className="mr-1" />
          <span className="text-sm">Назад</span>
        </Button>

        <Card className="p-3 md:p-6 bg-card/90 backdrop-blur border-purple-500/20">
          <div className="flex items-start gap-3 md:gap-6 mb-3 md:mb-6">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold flex-shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.username[0]?.toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-1 md:mb-1.5">
                <h1 className="text-lg md:text-2xl font-bold truncate">{profile.username}</h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs whitespace-nowrap self-start ${
                  profile.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {profile.status === 'online' ? 'Онлайн' : 'Не в сети'}
                </span>
              </div>

              {profile.bio && (
                <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">{profile.bio}</p>
              )}

              {isOwnProfile && (
                <div className="flex items-center gap-1 md:gap-1.5 text-muted-foreground mb-2 md:mb-3">
                  <Icon name="Zap" size={14} className="text-yellow-500" />
                  <span className="text-xs md:text-sm">{profile.energy} энергии</span>
                </div>
              )}

              {!isOwnProfile && (
                <div className="flex flex-col md:flex-row gap-2">
                  <Button onClick={openChat} className="bg-gradient-to-r from-purple-500 to-pink-500 h-8 md:h-9 text-xs md:text-sm flex-1">
                    <Icon name="MessageCircle" size={14} className="mr-1.5" />
                    Написать
                  </Button>
                  <Button 
                    onClick={handleBlockToggle}
                    disabled={checkingBlock}
                    variant={isBlocked ? "outline" : "destructive"}
                    className="h-8 md:h-9 text-xs md:text-sm"
                  >
                    {checkingBlock ? (
                      <Icon name="Loader2" size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Icon name={isBlocked ? "UserCheck" : "UserX"} size={14} className="mr-1.5" />
                        {isBlocked ? "Разблокировать" : "Заблокировать"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-3 md:pt-6">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h2 className="text-base md:text-xl font-semibold">Фотографии ({photos.length}/6)</h2>
            </div>

            {isOwnProfile && photos.length < 6 && (
              <div className="mb-3 md:mb-4">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <Button 
                    asChild
                    disabled={uploadingFile}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 h-9 md:h-10 text-sm"
                  >
                    <span className="cursor-pointer flex items-center justify-center">
                      {uploadingFile ? (
                        <>
                          <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                          <span className="text-xs md:text-sm">Загрузка...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="Upload" size={16} className="mr-2" />
                          <span className="text-xs md:text-sm">Загрузить фото</span>
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            )}

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 md:gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <button
                      onClick={() => openPhotoViewer(index)}
                      className="w-full h-full"
                    >
                      <img
                        src={photo.url}
                        alt="User photo"
                        className="w-full h-full object-cover rounded-md md:rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </button>
                    {isOwnProfile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto(photo.id);
                        }}
                        className="absolute top-1 right-1 md:top-2 md:right-2 p-1.5 md:p-2 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <Icon name="Trash2" size={16} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {isOwnProfile ? 'Добавьте свои фотографии' : 'Нет фотографий'}
              </p>
            )}
          </div>
        </Card>
      </div>

      {viewerOpen && photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <Icon name="X" size={24} className="text-white" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon name="ChevronLeft" size={32} className="text-white" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <Icon name="ChevronRight" size={32} className="text-white" />
              </button>
            </>
          )}

          <div className="max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <img
              src={photos[currentPhotoIndex].url}
              alt="Full size photo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentPhotoIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}