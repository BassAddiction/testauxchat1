import { useState, useRef, useEffect } from "react";
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
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('auxchat_user_id');
    return stored ? parseInt(stored) : null;
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

  const reactionEmojis = ["❤️", "👍", "🔥", "🎉", "😂", "😍"];

  const loadMessages = async () => {
    try {
      const response = await fetch(
        "https://functions.poehali.dev/392f3078-9f28-4640-ab86-dcabecaf721a?limit=50&offset=0"
      );
      const data = await response.json();
      if (response.ok && data.messages) {
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          username: msg.user.username,
          avatar: msg.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user.username}`,
          text: msg.text,
          timestamp: new Date(msg.created_at),
          reactions: msg.reactions || [],
        }));
        setMessages(formattedMessages.reverse());
      }
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  const loadUser = async (id: number) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/518f730f-1a8e-45ad-b0ed-e9a66c5a3784?user_id=${id}`
      );
      const data = await response.json();
      if (response.ok) {
        setUser({
          username: data.username,
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
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

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userId) {
      loadUser(userId);
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
        if (data.test_code) {
          alert(`ТЕСТОВЫЙ РЕЖИМ: Ваш код ${data.test_code}`);
        } else {
          alert("SMS-код отправлен!");
        }
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
          "https://functions.poehali.dev/f98950dc-a5dc-45f3-bda3-ce9f2ad77f44",
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

  const handleReaction = async (messageId: number, emoji: string) => {
    if (!userId) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/3c9e0b04-92f9-42ab-a40e-ebc29add4ac4",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            message_id: messageId,
            emoji,
          }),
        }
      );
      
      if (response.ok) {
        loadMessages();
      }
    } catch (error) {
      console.error("Reaction error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Icon name="MessageCircle" className="text-primary" size={32} />
          <h1 className="text-2xl font-bold text-primary">auxchat</h1>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 mr-2">
                <Icon name="Zap" className="text-yellow-500" size={20} />
                <span className="font-semibold">{user.energy}</span>
              </div>
              <Dialog open={showProfile} onOpenChange={setShowProfile}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.username} />
                      <AvatarFallback>{user.username[0]}</AvatarFallback>
                    </Avatar>
                    <span className="ml-2">{user.username}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Профиль</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
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
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                      <Icon name="Zap" className="text-yellow-500" size={24} />
                      <div>
                        <p className="font-semibold">{user.energy} энергии</p>
                        <p className="text-xs text-muted-foreground">
                          1 сообщение = 10 энергии
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <Icon name="LogOut" size={16} className="mr-2" />
                      Выйти
                    </Button>
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

      <main className="flex-1 container mx-auto max-w-4xl p-4 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-lg">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <Avatar>
                  <AvatarImage src={msg.avatar} alt={msg.username} />
                  <AvatarFallback>{msg.username[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{msg.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{msg.text}</p>
                  <div className="flex flex-wrap gap-1">
                    {msg.reactions.map((reaction, i) => (
                      <button
                        key={i}
                        className="px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors"
                        onClick={() => handleReaction(msg.id, reaction.emoji)}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <Icon name="Plus" size={14} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xs">
                        <DialogHeader>
                          <DialogTitle>Добавить реакцию</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-3 gap-2">
                          {reactionEmojis.map((emoji) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              className="text-2xl h-16"
                              onClick={() => handleReaction(msg.id, emoji)}
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                placeholder={user ? "Напишите сообщение..." : "Войдите для отправки"}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={!user}
              />
              <Button onClick={handleSendMessage} disabled={!user}>
                <Icon name="Send" size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Index;
