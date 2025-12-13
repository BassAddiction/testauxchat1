import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { FUNCTIONS } from '@/lib/func2url';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PhotoGallery from '@/components/profile/PhotoGallery';
import PhotoViewer from '@/components/profile/PhotoViewer';
import EnergyPurchaseDialog from '@/components/profile/EnergyPurchaseDialog';
import { useProfileData } from '@/hooks/useProfileData';
import { usePhotoManagement } from '@/hooks/usePhotoManagement';
import { useBlockManagement } from '@/hooks/useBlockManagement';

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('auxchat_user_id');
  const isOwnProfile = String(currentUserId) === String(userId);

  const { profile, photos, loading, loadProfile, loadPhotos, setProfile } = useProfileData(userId, currentUserId);
  
  const {
    isAddingPhoto,
    uploadingFile,
    setUploadingFile,
    handlePhotoUpload,
    deletePhoto
  } = usePhotoManagement(currentUserId, loadPhotos);

  const { isBlocked, checkingBlock, handleBlockToggle } = useBlockManagement(userId, currentUserId, isOwnProfile);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  const [energyAmount, setEnergyAmount] = useState(500);

  const calculatePrice = (rubles: number) => {
    const discountPercent = ((rubles - 500) / (10000 - 500)) * 30;
    const baseEnergy = rubles;
    const bonus = Math.floor(baseEnergy * (discountPercent / 100));
    return { energy: baseEnergy + bonus, discount: Math.round(discountPercent) };
  };

  const { energy, discount } = calculatePrice(energyAmount);

  const handleEnergyPurchase = async () => {
    try {
      const response = await fetch(FUNCTIONS['add-energy'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId || '0'
        },
        body: JSON.stringify({ 
          energy_amount: energy,
          price: energyAmount 
        })
      });

      if (response.ok) {
        toast.success(`Получено ${energy} энергии за ${energyAmount}₽!`);
        setEnergyModalOpen(false);
        loadProfile();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка покупки');
      }
    } catch (error) {
      toast.error('Ошибка покупки энергии');
    }
  };

  const openChat = () => {
    navigate(`/chat/${userId}`);
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
          <ProfileHeader
            profile={profile}
            isOwnProfile={isOwnProfile}
            isBlocked={isBlocked}
            checkingBlock={checkingBlock}
            onOpenChat={openChat}
            onBlockToggle={handleBlockToggle}
            onOpenEnergyModal={() => setEnergyModalOpen(true)}
          />

          <PhotoGallery
            photos={photos}
            isOwnProfile={isOwnProfile}
            isAddingPhoto={isAddingPhoto}
            onPhotoUpload={handlePhotoUpload}
            onPhotoClick={openPhotoViewer}
            onDeletePhoto={deletePhoto}
          />
        </Card>
      </div>

      <PhotoViewer
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNext={nextPhoto}
        onPrev={prevPhoto}
        onSetIndex={setCurrentPhotoIndex}
      />

      <EnergyPurchaseDialog
        isOpen={energyModalOpen}
        onClose={() => setEnergyModalOpen(false)}
        profile={profile}
        energyAmount={energyAmount}
        onEnergyAmountChange={setEnergyAmount}
        onPurchase={handleEnergyPurchase}
      />
    </div>
  );
}