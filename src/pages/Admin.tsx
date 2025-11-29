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
  const [adminId, setAdminId] = useState<number | null>(null);
  const [energyAmount, setEnergyAmount] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setAdminId(parseInt(storedUserId));
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(
        "https://functions.poehali.dev/c9561d6d-10c4-4b31-915e-07e239e7ae5f"
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

  const addEnergy = async (userId: number, amount: number) => {
    if (!adminId) {
      alert("Войдите в систему");
      return;
    }

    try {
      const response = await fetch(
        "https://functions.poehali.dev/c9561d6d-10c4-4b31-915e-07e239e7ae5f",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: adminId,
            action: "add_energy",
            target_user_id: userId,
            amount: amount,
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        alert(`Добавлено ${amount} энергии`);
        loadUsers();
      } else {
        alert("Ошибка: " + (data.error || "Нет доступа"));
      }
    } catch (error) {
      console.error("Error adding energy:", error);
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
          <Button variant="outline" onClick={loadUsers}>
            <Icon name="RefreshCw" size={18} className="mr-2" />
            Обновить
          </Button>
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

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-secondary/20 px-4 py-2 rounded-lg">
                    <Icon name="Zap" className="text-primary" size={20} />
                    <span className="font-semibold">{user.energy}</span>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Icon name="Plus" size={16} className="mr-2" />
                        Добавить энергию
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
                              addEnergy(selectedUserId, energyAmount);
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
