import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";

interface Message {
  id: number;
  userId: number;
  username: string;
  avatar: string;
  text: string;
  timestamp: Date;
  reactions: { emoji: string; count: number }[];
}

interface User {
  username: string;
  avatar: string;
  phone: string;
  energy: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(() => {
    // Force clear old data and set to user 7
    const appVersion = localStorage.getItem('app_version');
    if (appVersion !== 'v2') {
      localStorage.clear();
      localStorage.setItem('app_version', 'v2');
      localStorage.setItem('auxchat_user_id', '7');
      localStorage.setItem('username', 'AuxChat');
      return 7;
    }
    
    const stored = localStorage.getItem('auxchat_user_id');
    if (stored) return parseInt(stored);
    
    // Auto-login as user 7 (AuxChat) if not logged in
    localStorage.setItem('auxchat_user_id', '7');
    localStorage.setItem('username', 'AuxChat');
    return 7;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsStep, setSmsStep] = useState<"phone" | "code" | "password">("phone");
  const [avatarFile, setAvatarFile] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [profilePhotos, setProfilePhotos] = useState<{id: number; url: string}[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [displayLimit, setDisplayLimit] = useState(() => {
    return window.innerWidth >= 768 ? 7 : 6;
  });
  const initialLimit = window.innerWidth >= 768 ? 7 : 6;
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [subscribedUsers, setSubscribedUsers] = useState<Set<number>>(new Set());

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  };

  const loadUnreadCount = async () => {
    if (!userId) return;
    try {
      const response = await fetch(
        'https://functions.poehali.dev/aea3125a-7d11-4637-af71-0998dfbaf5b2',
        {
          headers: {
            'X-User-Id': userId.toString()
          }
        }
      );
      const data = await response.json();
      const total = (data.conversations || []).reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
      
      // Инициализируем счётчик при первой загрузке
      if (prevUnreadRef.current === 0) {
        prevUnreadRef.current = total;
      } else if (total > prevUnreadRef.current) {
        // Если появились новые непрочитанные
        playNotificationSound();
        prevUnreadRef.current = total;
      }
      
      setUnreadCount(total);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadMessages = async (retryCount = 0) => {
    try {
      const response = await fetch(
        "https://functions.poehali.dev/392f3078-9f28-4640-ab86-dcabecaf721a?limit=20&offset=0",
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.error("Response not OK:", response.status, response.statusText);
        if (retryCount < 2) {
          setTimeout(() => loadMessages(retryCount + 1), 1000);
        }
        return;
      }
      
      const data = await response.json();
      if (data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          userId: msg.user.id,
          username: msg.user.username,
          avatar: msg.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user.username}`,
          text: msg.text,
          timestamp: new Date(msg.created_at),
          reactions: msg.reactions || [],
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Load messages error:", error);
      if (retryCount < 2) {
        setTimeout(() => loadMessages(retryCount + 1), 1000);
      }
    }
  };

  const loadUser = async (id: number) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${id}`
      );
      const data = await response.json();
      if (response.ok) {
        const photosResponse = await fetch(
          `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${id}`,
          {
            headers: { 'X-User-Id': id.toString() }
          }
        );
        const photosData = await photosResponse.json();
        const userAvatar = photosData.photos && photosData.photos.length > 0 
          ? photosData.photos[0].url 
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`;
        
        setUser({
          username: data.username,
          avatar: userAvatar,
          phone: data.phone,
          energy: data.energy,
        });
      } else {
        localStorage.removeItem('auxchat_user_id');
        setUserId(null);
      }
    } catch (error) {
      console.error("Load user error:", error);
    }
  };

  const loadSubscribedUsers = async () => {
    if (!userId) return;
    try {
      const response = await fetch(
        'https://functions.poehali.dev/ac3ea823-b6ec-4987-9602-18e412db6458',
        {
          headers: { 'X-User-Id': userId.toString() }
        }
      );
      const data = await response.json();
      setSubscribedUsers(new Set(data.subscribedUserIds || []));
    } catch (error) {
      console.error('Load subscribed users error:', error);
    }
  };

  const updateActivity = async () => {
    if (!userId) return;
    try {
      await fetch('https://functions.poehali.dev/a70b420b-cb23-4948-9a56-b8cefc96f976', {
        method: 'POST',
        headers: { 'X-User-Id': userId.toString() }
      });
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  useEffect(() => {
    loadMessages();
    if (userId) {
      updateActivity();
      loadProfilePhotos();
      loadUnreadCount();
      loadSubscribedUsers();
    }
    const messagesInterval = setInterval(() => {
      loadMessages();
      if (userId) {
        loadUnreadCount();
      }
    }, 5000);
    const activityInterval = setInterval(() => {
      if (userId) updateActivity();
    }, 60000);
    return () => {
      clearInterval(messagesInterval);
      clearInterval(activityInterval);
    };
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUser(userId);
      loadUnreadCount();
    }
  }, [userId]);

  const handleLogin = async () => {
    if (!phone || !password) {
      alert("Введите телефон и пароль");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/57bd04c8-4731-4857-a2b8-a71c6bda783a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setUser({
          username: data.username,
          avatar: data.avatar,
          phone: data.phone,
          energy: data.energy,
        });
        setUserId(data.id);
        localStorage.setItem('auxchat_user_id', data.id.toString());
        setIsAuthOpen(false);
        setPhone("");
        setPassword("");
      } else {
        alert(data.error || "Ошибка входа");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Ошибка подключения");
    }
  };

  const handleSendSMS = async () => {
    if (phone.length < 10) {
      alert("Введите корректный номер телефона");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/39b076de-8be1-48c0-8684-f94df4548b91",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setSmsStep("code");
        alert("SMS-код отправлен на ваш телефон!");
      } else {
        alert(data.error || "Ошибка отправки SMS");
      }
    } catch (error) {
      console.error("SMS error:", error);
      alert("Ошибка подключения");
    }
  };

  const handleVerifySMS = async () => {
    if (smsCode.length !== 4) {
      alert("Введите 4-значный код");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/c4359550-f604-4126-8e72-5087a670b7cb",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: smsCode }),
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setSmsStep("password");
        setSmsCode("");
      } else {
        alert(data.error || "Неверный код");
      }
    } catch (error) {
      console.error("Verify error:", error);
      alert("Ошибка подключения");
    }
  };

  const handleRegister = async () => {
    if (!username || !password || password.length < 6) {
      alert("Введите имя и пароль (минимум 6 символов)");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/1d4d268e-0d0a-454a-a1cc-ecd19c83471a",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            username,
            password,
            avatar: avatarFile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          }),
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        setUser({
          username: data.username,
          avatar: data.avatar,
          phone: data.phone,
          energy: data.energy,
        });
        setUserId(data.id);
        localStorage.setItem('auxchat_user_id', data.id.toString());
        setIsAuthOpen(false);
        resetAuthForm();
      } else {
        alert(data.error || "Ошибка регистрации");
      }
    } catch (error) {
      console.error("Register error:", error);
      alert("Ошибка подключения");
    }
  };

  const handleResetPassword = async () => {
    if (!password || password.length < 6) {
      alert("Введите новый пароль (минимум 6 символов)");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/f1d38f0f-3d7d-459b-a52f-9ae703ac77d3",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, new_password: password }),
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        alert("Пароль успешно изменён! Теперь войдите с новым паролем.");
        setAuthMode("login");
        resetAuthForm();
      } else {
        alert(data.error || "Ошибка сброса пароля");
      }
    } catch (error) {
      console.error("Reset error:", error);
      alert("Ошибка подключения");
    }
  };

  const resetAuthForm = () => {
    setPhone("");
    setPassword("");
    setUsername("");
    setSmsCode("");
    setAvatarFile("");
    setSmsStep("phone");
  };

  const loadProfilePhotos = async () => {
    if (!userId) return;
    try {
      const response = await fetch(
        `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
        {
          headers: {
            'X-User-Id': userId.toString()
          }
        }
      );
      const data = await response.json();
      setProfilePhotos(data.photos || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const addPhotoByUrl = async () => {
    if (!photoUrl.trim() || !userId) return;
    setIsAddingPhoto(true);
    try {
      const response = await fetch(
        'https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId.toString()
          },
          body: JSON.stringify({ photoUrl })
        }
      );
      if (response.ok) {
        alert('Фото добавлено');
        setPhotoUrl('');
        loadProfilePhotos();
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка');
      }
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handlePhotoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 МБ');
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const uploadResponse = await fetch('https://functions.poehali.dev/7046f3b0-52a8-4455-a8b2-c28638e5002f', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId.toString()
          },
          body: JSON.stringify({ 
            fileData: base64,
            fileName: file.name
          })
        });

        if (!uploadResponse.ok) {
          alert('Ошибка загрузки фото');
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
              'X-User-Id': userId.toString()
            },
            body: JSON.stringify({ photoUrl: url })
          }
        );

        if (addPhotoResponse.ok) {
          alert('Фото добавлено');
          loadProfilePhotos();
        } else {
          const error = await addPhotoResponse.json();
          alert(error.error || 'Ошибка добавления фото');
        }
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Ошибка загрузки фото');
      setUploadingFile(false);
    }
  };

  const setMainPhoto = async (photoId: number) => {
    if (!userId) return;
    const response = await fetch(
      'https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId.toString()
        },
        body: JSON.stringify({ photoId, action: 'set_main' })
      }
    );
    if (response.ok) {
      loadProfilePhotos();
      if (user) {
        const updatedPhotos = await fetch(
          `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?userId=${userId}`,
          {
            headers: { 'X-User-Id': userId.toString() }
          }
        );
        const data = await updatedPhotos.json();
        if (data.photos && data.photos.length > 0) {
          setUser({ ...user, avatar: data.photos[0].url });
        }
      }
    }
  };

  const deletePhoto = async (photoId: number) => {
    if (!userId) return;
    const response = await fetch(
      `https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734?photoId=${photoId}`,
      {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId.toString()
        }
      }
    );
    if (response.ok) {
      alert('Фото удалено');
      loadProfilePhotos();
    }
  };

  const openPhotoViewer = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % profilePhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + profilePhotos.length) % profilePhotos.length);
  };

  const handleLogout = () => {
    setUser(null);
    setUserId(null);
    localStorage.removeItem('auxchat_user_id');
    setShowProfile(false);
  };

  const handleUpdateUsername = () => {
    if (user && newUsername.trim()) {
      setUser({ ...user, username: newUsername.trim() });
      setIsEditingUsername(false);
      setNewUsername("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userId) {
      setIsAuthOpen(true);
      return;
    }

    if (user.energy < 10) {
      alert("Недостаточно энергии! Пополните баланс.");
      return;
    }

    if (messageText.trim()) {
      try {
        const response = await fetch(
          "https://functions.poehali.dev/8d34c54f-b2de-42c1-ac0c-9f6ecf5e16f6",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              text: messageText.trim(),
            }),
          }
        );
        const data = await response.json();
        
        if (response.ok) {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.08);
            
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.08);
          } catch (e) {
            console.log('Audio play failed:', e);
          }
          setMessageText("");
          loadMessages();
          if (data.energy !== undefined) {
            setUser({ ...user, energy: data.energy });
          }
        } else {
          if (response.status === 403 && data.error?.includes('banned')) {
            alert("Вы заблокированы и не можете отправлять сообщения");
            handleLogout();
          } else {
            alert(data.error || "Ошибка отправки");
          }
        }
      } catch (error) {
        console.error("Send message error:", error);
        alert("Ошибка подключения");
      }
    }
  };

  const checkSubscription = async (targetUserId: number) => {
    if (!userId) return;
    setCheckingSubscription(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/332c7a6c-5c6e-4f84-85de-81c8fd6ab8d5?targetUserId=${targetUserId}`,
        {
          headers: { 'X-User-Id': userId.toString() }
        }
      );
      const data = await response.json();
      setIsSubscribed(data.isSubscribed || false);
    } catch (error) {
      console.error('Check subscription error:', error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async () => {
    if (!userId || !selectedUserId) return;
    
    try {
      const response = await fetch(
        "https://functions.poehali.dev/332c7a6c-5c6e-4f84-85de-81c8fd6ab8d5",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId.toString()
          },
          body: JSON.stringify({ targetUserId: selectedUserId }),
        }
      );
      
      if (response.ok) {
        setIsSubscribed(true);
        loadSubscribedUsers();
        alert(`Вы подписались на ${selectedUsername}!`);
        setSubscriptionModalOpen(false);
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      alert("Ошибка подписки");
    }
  };

  const handleUnsubscribe = async () => {
    if (!userId || !selectedUserId) return;
    
    try {
      const response = await fetch(
        `https://functions.poehali.dev/332c7a6c-5c6e-4f84-85de-81c8fd6ab8d5?targetUserId=${selectedUserId}`,
        {
          method: "DELETE",
          headers: { "X-User-Id": userId.toString() }
        }
      );
      
      if (response.ok) {
        setIsSubscribed(false);
        loadSubscribedUsers();
        alert(`Вы отписались от ${selectedUsername}`);
        setSubscriptionModalOpen(false);
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
      alert("Ошибка отписки");
    }
  };

  const openSubscriptionModal = (targetUserId: number, username: string) => {
    if (!userId) {
      setIsAuthOpen(true);
      return;
    }
    if (targetUserId === userId) {
      alert("Нельзя подписаться на самого себя");
      return;
    }
    setSelectedUserId(targetUserId);
    setSelectedUsername(username);
    setSubscriptionModalOpen(true);
    checkSubscription(targetUserId);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      try {
        const response = await fetch(
          "https://functions.poehali.dev/7ad164df-b661-49f1-882d-10407afaa9d8",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              avatar: base64,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser({ ...user!, avatar: data.avatar_url });
        }
      } catch (error) {
        console.error("Avatar update error:", error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddEnergy = async (amount: number) => {
    if (!userId || !user) {
      console.log("No user or userId");
      return;
    }

    console.log("Creating payment for amount:", amount);

    try {
      const response = await fetch(
        "https://functions.poehali.dev/f92685aa-bd08-4a3c-9170-4d421a00058c",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            amount: amount,
          }),
        }
      );

      console.log("Payment response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Payment data:", data);
        if (data.payment_url) {
          window.location.href = data.payment_url;
        }
      } else {
        const error = await response.json();
        console.error("Payment failed:", error);
        alert("Ошибка создания платежа: " + (error.error || "Неизвестная ошибка"));
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Ошибка соединения с сервером оплаты");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-2 md:px-3 py-2 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Icon name="MessageCircle" className="text-red-500" size={20} />
          <h1 className="text-lg md:text-xl font-bold text-red-500">AuxChat</h1>
        </div>
        <div className="flex items-center gap-0.5 md:gap-1">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/messages')}
                className="relative h-8 w-8 p-0"
              >
                <Icon name="MessageCircle" size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/subscriptions')}
                className="relative h-8 w-8 p-0"
              >
                <Icon name="Users" size={18} />
                {subscribedUsers.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {subscribedUsers.size}
                  </span>
                )}
              </Button>
              <div className="flex items-center gap-0.5 px-1">
                <Icon name="Zap" className="text-yellow-500" size={14} />
                <span className="text-xs md:text-sm font-semibold">{user.energy}</span>
              </div>
              <Dialog open={showProfile} onOpenChange={setShowProfile}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-1.5 md:px-2">
                    <Avatar className="h-6 w-6 md:h-7 md:w-7">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="ml-1 md:ml-1.5 text-xs md:text-sm max-w-[60px] md:max-w-none truncate">{user.username}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Профиль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        {isEditingUsername ? (
                          <div className="flex gap-2">
                            <Input
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="Новое имя"
                            />
                            <Button size="sm" onClick={handleUpdateUsername}>
                              <Icon name="Check" size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {user.username}
                            </h3>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setNewUsername(user.username);
                                setIsEditingUsername(true);
                              }}
                            >
                              <Icon name="Edit2" size={16} />
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                        <Icon name="Zap" className="text-yellow-500" size={24} />
                        <div className="flex-1">
                          <p className="font-semibold">{user.energy} энергии</p>
                          <p className="text-xs text-muted-foreground">
                            1 сообщение = 10 энергии
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-xs md:text-sm"
                          onClick={() => handleAddEnergy(50)}
                        >
                          <Icon name="Zap" size={14} className="mr-1" />
                          +50 за 50₽
                        </Button>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-xs md:text-sm"
                          onClick={() => handleAddEnergy(100)}
                        >
                          <Icon name="Zap" size={14} className="mr-1" />
                          +100 за 90₽
                        </Button>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Фотографии ({profilePhotos.length}/6)</h3>
                      
                      {profilePhotos.length < 6 && (
                        <div className="mb-4">
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoFileUpload}
                              className="hidden"
                              disabled={uploadingFile}
                            />
                            <Button 
                              asChild
                              disabled={uploadingFile}
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                            >
                              <span className="cursor-pointer flex items-center justify-center">
                                {uploadingFile ? (
                                  <>
                                    <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                                    Загрузка...
                                  </>
                                ) : (
                                  <>
                                    <Icon name="Upload" size={20} className="mr-2" />
                                    Загрузить фото
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                      )}

                      {profilePhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {profilePhotos.map((photo, index) => (
                            <div key={photo.id} className="relative group aspect-square">
                              {index === 0 && (
                                <div className="absolute top-1 left-1 px-2 py-0.5 bg-blue-500 rounded-full z-10">
                                  <span className="text-[10px] text-white font-semibold">Главное</span>
                                </div>
                              )}
                              <button
                                onClick={() => openPhotoViewer(index)}
                                className="w-full h-full"
                              >
                                <img
                                  src={photo.url}
                                  alt="Photo"
                                  className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                                />
                              </button>
                              <div className="absolute bottom-1 left-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                {index !== 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMainPhoto(photo.id);
                                    }}
                                    className="flex-1 p-1 bg-blue-500/90 rounded text-white hover:bg-blue-600"
                                    title="Сделать главным"
                                  >
                                    <Icon name="Star" size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePhoto(photo.id);
                                  }}
                                  className="flex-1 p-1 bg-red-500/90 rounded text-white hover:bg-red-600"
                                  title="Удалить"
                                >
                                  <Icon name="Trash2" size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Добавьте фото</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowProfile(false);
                          navigate('/blacklist');
                        }}
                      >
                        <Icon name="Ban" size={16} className="mr-2" />
                        Черный список
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleLogout}
                      >
                        <Icon name="LogOut" size={16} className="mr-2" />
                        Выйти
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Icon name="LogIn" size={16} className="mr-2" />
                  Войти
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {authMode === "login" ? "Вход" : authMode === "register" ? "Регистрация" : "Восстановление"}
                  </DialogTitle>
                </DialogHeader>
                
                {authMode === "login" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Телефон</Label>
                      <Input
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Пароль</Label>
                      <Input
                        type="password"
                        placeholder="Ваш пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleLogin}>
                      Войти
                    </Button>
                    <div className="text-center space-y-2">
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => {
                          setAuthMode("reset");
                          resetAuthForm();
                        }}
                      >
                        Забыли пароль?
                      </button>
                      <div>
                        <button
                          className="text-sm text-blue-600 hover:underline"
                          onClick={() => {
                            setAuthMode("register");
                            resetAuthForm();
                          }}
                        >
                          Нет аккаунта? Зарегистрируйтесь
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {authMode === "register" && (
                  <div className="space-y-4">
                    {smsStep === "phone" && (
                      <>
                        <div>
                          <Label>Телефон</Label>
                          <Input
                            type="tel"
                            placeholder="+7 (999) 123-45-67"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleSendSMS}>
                          Получить код
                        </Button>
                      </>
                    )}
                    
                    {smsStep === "code" && (
                      <>
                        <div>
                          <Label>SMS-код</Label>
                          <Input
                            type="text"
                            placeholder="1234"
                            maxLength={4}
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleVerifySMS}>
                          Подтвердить
                        </Button>
                      </>
                    )}
                    
                    {smsStep === "password" && (
                      <>
                        <div>
                          <Label>Имя пользователя</Label>
                          <Input
                            placeholder="Ваше имя"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Пароль (минимум 6 символов)</Label>
                          <Input
                            type="password"
                            placeholder="Придумайте пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Аватар (необязательно)</Label>
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </div>
                        <Button className="w-full" onClick={handleRegister}>
                          Зарегистрироваться
                        </Button>
                      </>
                    )}
                    
                    <button
                      className="text-sm text-blue-600 hover:underline w-full text-center"
                      onClick={() => {
                        setAuthMode("login");
                        resetAuthForm();
                      }}
                    >
                      Уже есть аккаунт? Войдите
                    </button>
                  </div>
                )}

                {authMode === "reset" && (
                  <div className="space-y-4">
                    {smsStep === "phone" && (
                      <>
                        <div>
                          <Label>Телефон</Label>
                          <Input
                            type="tel"
                            placeholder="+7 (999) 123-45-67"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleSendSMS}>
                          Получить код
                        </Button>
                      </>
                    )}
                    
                    {smsStep === "code" && (
                      <>
                        <div>
                          <Label>SMS-код</Label>
                          <Input
                            type="text"
                            placeholder="1234"
                            maxLength={4}
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleVerifySMS}>
                          Подтвердить
                        </Button>
                      </>
                    )}
                    
                    {smsStep === "password" && (
                      <>
                        <div>
                          <Label>Новый пароль (минимум 6 символов)</Label>
                          <Input
                            type="password"
                            placeholder="Новый пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <Button className="w-full" onClick={handleResetPassword}>
                          Сбросить пароль
                        </Button>
                      </>
                    )}
                    
                    <button
                      className="text-sm text-blue-600 hover:underline w-full text-center"
                      onClick={() => {
                        setAuthMode("login");
                        resetAuthForm();
                      }}
                    >
                      Вернуться ко входу
                    </button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl p-2 md:p-4 flex flex-col overflow-hidden">
        <Card className="flex-1 flex flex-col shadow-lg">
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-4">
            {displayLimit < messages.length && (
              <div className="text-center pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayLimit(displayLimit + initialLimit)}
                >
                  <Icon name="ChevronUp" size={16} className="mr-2" />
                  Показать предыдущие {initialLimit}
                </Button>
              </div>
            )}
            {messages.slice(-displayLimit).map((msg) => {
              const isSubscribedUser = subscribedUsers.has(msg.userId);
              return (
              <div 
                key={msg.id} 
                className={`flex gap-2 p-2 md:p-3 rounded-lg transition-colors shadow-sm hover:shadow-md ${
                  isSubscribedUser 
                    ? 'bg-purple-50 hover:bg-purple-100 ring-2 ring-purple-300' 
                    : 'bg-white/60 hover:bg-white/80'
                }`}
              >
                <button onClick={() => navigate(`/profile/${msg.userId}`)}>
                  <Avatar className="cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all h-9 w-9 md:h-10 md:w-10 flex-shrink-0">
                    <AvatarImage src={msg.avatar} alt={msg.username} />
                    <AvatarFallback>{msg.username[0]}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 md:gap-1.5 mb-0.5">
                    <button 
                      onClick={() => navigate(`/profile/${msg.userId}`)}
                      className="font-semibold text-xs md:text-sm hover:text-purple-500 transition-colors truncate max-w-[120px] md:max-w-none"
                    >
                      {msg.username}
                    </button>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm mb-1 md:mb-1.5 break-words leading-relaxed">{msg.text}</p>
                  {msg.userId !== userId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 md:h-7 px-2 md:px-3 text-[11px] md:text-xs -ml-2"
                      onClick={() => openSubscriptionModal(msg.userId, msg.username)}
                    >
                      <Icon name="Plus" size={12} className="mr-0.5 md:mr-1" />
                      Подписаться
                    </Button>
                  )}
                </div>
              </div>
            );
            })}
          </div>
          
          <div className="p-3 md:p-4 border-t bg-white flex-shrink-0">
            <div className="space-y-2">
              <div className="relative flex items-end">
                <textarea
                  placeholder={user ? "Напишите сообщение..." : "Войдите для отправки"}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value.slice(0, 140))}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={!user}
                  maxLength={140}
                  rows={1}
                  className="flex-1 pl-4 pr-14 py-3 rounded-3xl border-2 border-gray-200 bg-gray-50 resize-none focus:outline-none focus:border-red-400 focus:bg-white disabled:opacity-50 text-base transition-all"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!user || !messageText.trim()} 
                  className="absolute right-1.5 bottom-1.5 h-9 w-9 p-0 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  <Icon name="Send" size={18} className="ml-0.5" />
                </Button>
              </div>
              {user && (
                <div className="text-right px-1">
                  <span className={`text-xs ${messageText.length > 120 ? 'text-orange-500' : messageText.length === 140 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {messageText.length}/140
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>

      {viewerOpen && profilePhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <Icon name="X" size={24} className="text-white" />
          </button>

          {profilePhotos.length > 1 && (
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
              src={profilePhotos[currentPhotoIndex].url}
              alt="Full size photo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {profilePhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {profilePhotos.map((_, index) => (
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

      {/* Subscription Modal */}
      <Dialog open={subscriptionModalOpen} onOpenChange={setSubscriptionModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Подписка на {selectedUsername}</DialogTitle>
          </DialogHeader>
          {checkingSubscription ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" size={32} className="animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? `Вы подписаны на ${selectedUsername}. Все сообщения этого пользователя будут выделены в общем чате.`
                  : `Подпишитесь на ${selectedUsername}, чтобы следить за всеми сообщениями в общем чате.`
                }
              </p>
              {isSubscribed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUnsubscribe}
                >
                  <Icon name="UserMinus" size={16} className="mr-2" />
                  Отписаться
                </Button>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                  onClick={handleSubscribe}
                >
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  Подписаться
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;