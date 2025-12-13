import { useState, useEffect } from "react";
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
import { useNavigate } from "react-router-dom";
import { FUNCTIONS } from "@/lib/func2url";

interface User {
  id: number;
  phone: string;
  username: string;
  avatar: string;
  energy: number;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [energyAmount, setEnergyAmount] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    const storedSecret = localStorage.getItem("admin_secret");
    if (storedSecret) {
      setAdminSecret(storedSecret);
      setIsAuthenticated(true);
      loadUsers();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUsers = async () => {
    try {
      // FUNCTION: admin-users - Получение списка всех пользователей (GET)
      const response = await fetch(
        FUNCTIONS['admin-users']
      );
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (adminSecret.trim()) {
      localStorage.setItem("admin_secret", adminSecret);
      setIsAuthenticated(true);
      loadUsers();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_secret");
    setAdminSecret("");
    setIsAuthenticated(false);
    navigate("/");
  };

  const performAction = async (action: string, userId: number, amount?: number) => {
    if (!adminSecret) {
      alert("Войдите в систему");
      return;
    }

    try {
      const body: any = {
        admin_secret: adminSecret,
        action: action,
        target_user_id: userId,
      };
      
      if (amount) {
        body.amount = amount;
      }

      // FUNCTION: admin-users - Выполнение админ-действий: add_energy, ban, unban, delete (POST)
      const response = await fetch(
        FUNCTIONS['admin-users'],
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        if (action === "add_energy") {
          alert(`Добавлено ${amount} энергии`);
        } else if (action === "ban") {
          alert("Пользователь заблокирован");
        } else if (action === "unban") {
          alert("Пользователь разблокирован");
        } else if (action === "delete") {
          alert("Пользователь удалён");
        }
        loadUsers();
      } else {
        if (data.error === "Invalid admin secret") {
          alert("Неверный секретный ключ");
          localStorage.removeItem("admin_secret");
          setIsAuthenticated(false);
        } else {
          alert("Ошибка: " + (data.error || "Нет доступа"));
        }
      }
    } catch (error) {
      console.error("Error performing action:", error);
      alert("Ошибка подключения");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-lg">Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Авторизация админа</h1>
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Icon name="X" size={20} />
              </Button>
            </div>
            <div>
              <Label htmlFor="secret">Секретный ключ</Label>
              <Input
                id="secret"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Введите секретный ключ"
                className="mt-2"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={!adminSecret.trim()}>
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <h1 className="text-3xl font-bold">Админ-панель</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUsers}>
              <Icon name="RefreshCw" size={18} className="mr-2" />
              Обновить
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {user.id} • Регистрация:{" "}
                      {new Date(user.created_at).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-secondary/20 px-4 py-2 rounded-lg">
                    <Icon name="Zap" className="text-primary" size={20} />
                    <span className="font-semibold">{user.energy}</span>
                  </div>
                  
                  {user.is_banned && (
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm font-medium">
                      Заблокирован
                    </div>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Icon name="Plus" size={16} className="mr-2" />
                        Энергия
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Добавить энергию для {user.username}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label htmlFor="energy">Количество энергии</Label>
                          <Input
                            id="energy"
                            type="number"
                            value={energyAmount}
                            onChange={(e) =>
                              setEnergyAmount(parseInt(e.target.value) || 0)
                            }
                            placeholder="Введите количество"
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setEnergyAmount(100)}
                            className="flex-1"
                          >
                            +100
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEnergyAmount(500)}
                            className="flex-1"
                          >
                            +500
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEnergyAmount(1000)}
                            className="flex-1"
                          >
                            +1000
                          </Button>
                        </div>
                        <Button
                          onClick={() => {
                            if (selectedUserId && energyAmount > 0) {
                              performAction("add_energy", selectedUserId, energyAmount);
                              setEnergyAmount(0);
                            }
                          }}
                          className="w-full"
                          disabled={energyAmount <= 0}
                        >
                          Добавить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  {user.is_banned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performAction("unban", user.id)}
                    >
                      <Icon name="Check" size={16} className="mr-2" />
                      Разблокировать
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => performAction("ban", user.id)}
                    >
                      <Icon name="Ban" size={16} className="mr-2" />
                      Заблокировать
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Удалить пользователя ${user.username}?`)) {
                        performAction("delete", user.id);
                      }
                    }}
                  >
                    <Icon name="Trash2" size={16} className="mr-2" />
                    Удалить
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Пользователи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}