import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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
      await api.updateActivity(currentUserId!);
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
      const data = await api.getUser(userId!);
      const photosData = await api.getProfilePhotos(userId!);
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
      const data = await api.getProfilePhotos(userId!);
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const addPhoto = async () => {
    if (!photoUrl.trim()) return;

    setIsAddingPhoto(true);
    try {
      await api.addPhoto(currentUserId!, photoUrl);
      toast.success('Фото добавлено');
      setPhotoUrl('');
      loadPhotos();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка добавления фото');
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const deletePhoto = async (photoId: number) => {
    try {
      await api.deletePhoto(currentUserId!, photoId);
      toast.success('Фото удалено');
      loadPhotos();
    } catch (error) {
      toast.error('Ошибка удаления фото');
    }
  };

  const openChat = () => {
    navigate(`/chat/${userId}`);
  };

  const checkBlockStatus = async () => {
    try {
      const data = await api.checkBlockStatus(currentUserId!, Number(userId));
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
        await api.unblockUser(currentUserId!, Number(userId));
        setIsBlocked(false);
        toast.success('Пользователь разблокирован');
      } else {
        await api.blockUser(currentUserId!, Number(userId));
        setIsBlocked(true);
        toast.success('Пользователь заблокирован');
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
      const extension = file.name.split('.').pop() || 'jpg';
      const { uploadUrl, fileUrl } = await api.getUploadUrl(file.type, extension);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadResponse.ok) {
        toast.error('Ошибка загрузки фото');
        setUploadingFile(false);
        return;
      }

      await api.addPhoto(currentUserId!, fileUrl);
      toast.success('Фото добавлено');
      loadPhotos();
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
                        {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <div className="mb-4 md:mb-6 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="URL фото"
                  className="flex-1 px-3 py-1.5 md:py-2 text-xs md:text-sm bg-background border border-purple-500/30 rounded-lg"
                />
                <Button 
                  onClick={addPhoto} 
                  disabled={isAddingPhoto}
                  className="h-8 md:h-10 text-xs md:text-sm"
                >
                  {isAddingPhoto ? <Icon name="Loader2" size={14} className="animate-spin" /> : 'Добавить'}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  id="file-upload"
                  className="hidden"
                />
                <label htmlFor="file-upload" className="flex-1">
                  <Button 
                    type="button"
                    variant="outline"
                    disabled={uploadingFile}
                    className="w-full h-8 md:h-10 text-xs md:text-sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {uploadingFile ? (
                      <>
                        <Icon name="Loader2" size={14} className="animate-spin mr-1.5" />
                        Загрузка...
                      </>
                    ) : (
                      <>
                        <Icon name="Upload" size={14} className="mr-1.5" />
                        Загрузить фото
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Фото</h2>
            {photos.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground">Нет загруженных фото</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 md:gap-3">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img
                      src={photo.url}
                      alt="Profile"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => openPhotoViewer(index)}
                    />
                    {isOwnProfile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePhoto(photo.id);
                        }}
                        className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 md:p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon name="Trash2" size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {viewerOpen && photos.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-2 right-2 md:top-4 md:right-4 text-white hover:text-gray-300 z-10"
          >
            <Icon name="X" size={24} />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 md:left-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
              >
                <Icon name="ChevronLeft" size={32} />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 md:right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
              >
                <Icon name="ChevronRight" size={32} />
              </button>
            </>
          )}

          <img
            src={photos[currentPhotoIndex].url}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
