import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TelegramLoginButton from '@/components/TelegramLoginButton';

interface Message {
  id: number;
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
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      username: 'Космонавт',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cosmonaut',
      text: 'Привет, AuxChat! Первое сообщение в чате!',
      timestamp: new Date(Date.now() - 3600000),
      reactions: [{ emoji: '❤️', count: 5 }, { emoji: '🔥', count: 3 }]
    },
    {
      id: 2,
      username: 'Энергетик',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Energy',
      text: 'Система энергии работает отлично!',
      timestamp: new Date(Date.now() - 1800000),
      reactions: [{ emoji: '👍', count: 8 }]
    }
  ]);
  const [messageText, setMessageText] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'profile'>('phone');
  const [avatarFile, setAvatarFile] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const reactionEmojis = ['❤️', '👍', '🔥', '🎉', '😂', '😍'];

  const handlePhoneSubmit = () => {
    if (phone.length >= 10) {
      setStep('code');
      alert('SMS-код отправлен на ваш телефон!');
    }
  };

  const handleCodeSubmit = () => {
    if (smsCode.length === 4) {
      setStep('profile');
    }
  };

  const handleTelegramAuth = async (telegramUser: any) => {
    try {
      const response = await fetch('https://functions.poehali.dev/1010306b-8aa0-4c54-828b-5427008a0172', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramUser)
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({
          username: userData.username,
          avatar: userData.avatar,
          phone: 'Telegram',
          energy: userData.energy
        });
        setIsRegistering(false);
      } else {
        const error = await response.json();
        alert('Ошибка авторизации: ' + (error.error || 'Попробуйте позже'));
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      alert('Ошибка подключения к Telegram');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowProfile(false);
  };

  const handleUpdateUsername = () => {
    if (user && newUsername.trim()) {
      setUser({ ...user, username: newUsername.trim() });
      setIsEditingUsername(false);
      setNewUsername('');
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

  const handleRegister = () => {
    if (username.trim() && phone) {
      setUser({
        username: username.trim(),
        avatar: avatarFile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        phone: phone,
        energy: 100
      });
      setIsRegistering(false);
      setStep('phone');
      setPhone('');
      setSmsCode('');
      setUsername('');
      setAvatarFile('');
    }
  };

  const handleSendMessage = () => {
    if (!user) {
      setIsRegistering(true);
      return;
    }

    if (user.energy < 10) {
      alert('Недостаточно энергии! Пополните баланс.');
      return;
    }

    if (messageText.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        username: user.username,
        avatar: user.avatar,
        text: messageText.trim(),
        timestamp: new Date(),
        reactions: []
      };

      setMessages([...messages, newMessage].slice(-10));
      setMessageText('');
      setUser({ ...user, energy: user.energy - 10 });
    }
  };

  const handleAddReaction = (messageId: number, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            )
          };
        } else {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1 }]
          };
        }
      }
      return msg;
    }));
  };

  const handleTopUp = (amount: number) => {
    if (user) {
      setUser({ ...user, energy: user.energy + amount });
      alert(`Пополнение на ${amount} энергии успешно!`);
    }
  };

  const handleUpdateAvatar = () => {
    if (user && avatarFile) {
      setUser({ ...user, avatar: avatarFile });
      setAvatarFile('');
      setShowProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-2xl">
              ⚡
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">AuxChat</h1>
          </div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary/20 px-4 py-2 rounded-lg">
                <Icon name="Zap" className="text-primary" size={20} />
                <span className="font-semibold text-foreground">{user.energy}</span>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Icon name="Plus" size={16} />
                    Пополнить
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Пополнение энергии</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => handleTopUp(50)} className="h-20 flex-col gap-1">
                        <span className="text-2xl">⚡</span>
                        <span className="text-sm">+50 энергии</span>
                        <span className="text-xs opacity-80">100 ₽</span>
                      </Button>
                      <Button onClick={() => handleTopUp(100)} className="h-20 flex-col gap-1">
                        <span className="text-2xl">⚡⚡</span>
                        <span className="text-sm">+100 энергии</span>
                        <span className="text-xs opacity-80">180 ₽</span>
                      </Button>
                      <Button onClick={() => handleTopUp(250)} className="h-20 flex-col gap-1">
                        <span className="text-2xl">⚡⚡⚡</span>
                        <span className="text-sm">+250 энергии</span>
                        <span className="text-xs opacity-80">400 ₽</span>
                      </Button>
                      <Button onClick={() => handleTopUp(500)} className="h-20 flex-col gap-1 bg-primary hover:bg-primary/90">
                        <span className="text-2xl">🔥</span>
                        <span className="text-sm">+500 энергии</span>
                        <span className="text-xs opacity-80">700 ₽</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Оплата через ЮКассу
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="w-9 h-9 border-2 border-primary/30">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.username[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{user.username}</span>
              </button>
            </div>
          ) : (
            <Button onClick={() => setIsRegistering(true)} className="gap-2">
              <Icon name="UserPlus" size={18} />
              Войти
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-220px)] flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-in">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/20">
                    <AvatarImage src={msg.avatar} />
                    <AvatarFallback>{msg.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{msg.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-3 mb-2">
                      <p className="text-foreground">{msg.text}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.reactions.map((reaction, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAddReaction(msg.id, reaction.emoji)}
                          className="bg-secondary/30 hover:bg-secondary/50 px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-colors"
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-muted-foreground">{reaction.count}</span>
                        </button>
                      ))}
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="w-7 h-7 bg-secondary/20 hover:bg-secondary/40 rounded-full flex items-center justify-center transition-colors">
                            <Icon name="Plus" size={14} />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Добавить реакцию</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-6 gap-2 pt-4">
                            {reactionEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  handleAddReaction(msg.id, emoji);
                                  document.querySelector<HTMLButtonElement>('[data-state="open"]')?.click();
                                }}
                                className="text-3xl hover:scale-125 transition-transform p-2"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={user ? "Написать сообщение..." : "Войдите, чтобы отправить сообщение"}
                className="flex-1"
                disabled={!user}
              />
              <Button onClick={handleSendMessage} disabled={!user || !messageText.trim()} className="gap-2">
                <Icon name="Send" size={18} />
                {user ? '10 ⚡' : 'Войти'}
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Вход в AuxChat</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">По телефону</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
            </TabsList>
            <TabsContent value="phone" className="space-y-4 pt-4">
              {step === 'phone' && (
                <>
                  <div>
                    <Label htmlFor="phone">Номер телефона</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__"
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handlePhoneSubmit} disabled={phone.length < 10} className="w-full">
                    Получить код
                  </Button>
                </>
              )}
              
              {step === 'code' && (
                <>
                  <div>
                    <Label htmlFor="code">Код из SMS</Label>
                    <Input
                      id="code"
                      type="text"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="____"
                      className="mt-2 text-center text-2xl tracking-widest"
                      maxLength={4}
                    />
                  </div>
                  <Button onClick={handleCodeSubmit} disabled={smsCode.length !== 4} className="w-full">
                    Подтвердить
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('phone')} className="w-full">
                    Изменить номер
                  </Button>
                </>
              )}
              
              {step === 'profile' && (
                <>
                  <div>
                    <Label htmlFor="username">Имя пользователя</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Введите ваше имя"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Фото профиля</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={avatarFile || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
                        <AvatarFallback className="text-3xl">{username[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Icon name="Upload" size={16} className="mr-2" />
                          Загрузить фото
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleRegister} disabled={!username.trim()} className="w-full">
                    Зарегистрироваться и получить 100 ⚡
                  </Button>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="telegram" className="space-y-4 pt-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#0088cc] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Send" size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Быстрый вход через Telegram</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Авторизуйтесь через Telegram за пару секунд
                </p>
                <TelegramLoginButton 
                  botUsername="YOUR_BOT_USERNAME"
                  onAuth={handleTelegramAuth}
                />
                <p className="text-xs text-muted-foreground mt-4">
                  ⚠️ Замените YOUR_BOT_USERNAME на username вашего бота
                </p>
                <p className="text-xs text-muted-foreground">
                  Не забудьте добавить TELEGRAM_BOT_TOKEN в секреты
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Профиль</DialogTitle>
          </DialogHeader>
          {user && (
            <div className="space-y-4 pt-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={avatarFile || user.avatar} />
                  <AvatarFallback className="text-4xl">{user.username[0]}</AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Icon name="Camera" size={16} />
                  Изменить фото
                </Button>
                {avatarFile && (
                  <Button onClick={handleUpdateAvatar} className="w-full">
                    Сохранить новое фото
                  </Button>
                )}
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Имя:</span>
                    {!isEditingUsername ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingUsername(true);
                            setNewUsername(user.username);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Icon name="Pencil" size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="h-8 w-32"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleUpdateUsername}
                          className="h-7 w-7 p-0"
                        >
                          <Icon name="Check" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingUsername(false);
                            setNewUsername('');
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Icon name="X" size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Телефон:</span>
                  <span className="font-medium">{user.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Энергия:</span>
                  <span className="font-medium">{user.energy} ⚡</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full gap-2"
                >
                  <Icon name="LogOut" size={16} />
                  Выйти из профиля
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;