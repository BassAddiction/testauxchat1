import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

export default function Oferta() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 my-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <Icon name="ArrowLeft" size={20} className="mr-2" />
          Назад
        </Button>

        <h1 className="text-3xl font-bold mb-6">Публичная оферта</h1>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Общие положения</h2>
            <p>
              Настоящая публичная оферта (далее — «Оферта») определяет условия
              использования сервиса AuxChat (далее — «Сервис»). Используя Сервис,
              вы соглашаетесь с условиями данной Оферты.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Предмет оферты</h2>
            <p>
              Сервис предоставляет платформу для обмена сообщениями с использованием
              системы энергии. Каждое сообщение требует расхода 10 единиц энергии.
              При регистрации пользователь получает 100 единиц энергии бесплатно.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Регистрация</h2>
            <p>
              Для использования Сервиса необходимо пройти регистрацию по номеру
              телефона с подтверждением через SMS-код. Пользователь гарантирует,
              что указанные при регистрации данные являются достоверными.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Правила использования</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Запрещено распространять спам и рекламу без согласия получателей</li>
              <li>Запрещено использовать Сервис для незаконных целей</li>
              <li>Запрещено нарушать права других пользователей</li>
              <li>Пользователь несёт ответственность за содержание своих сообщений</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Система энергии</h2>
            <p>
              Энергия расходуется при отправке сообщений (10 единиц за сообщение).
              Администрация оставляет за собой право изменять стоимость сообщений
              и способы пополнения энергии.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Персональные данные</h2>
            <p>
              Сервис обрабатывает персональные данные пользователей (номер телефона,
              никнейм, фотографию профиля) исключительно для обеспечения работы
              платформы. Данные не передаются третьим лицам без согласия пользователя.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Ответственность</h2>
            <p>
              Администрация не несёт ответственности за содержание сообщений
              пользователей и возможные убытки от использования Сервиса.
              Сервис предоставляется «как есть».
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Изменение условий</h2>
            <p>
              Администрация имеет право изменять условия Оферты в любое время.
              Продолжение использования Сервиса после изменений означает
              согласие с новыми условиями.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Контакты</h2>
            <p>
              По всем вопросам обращайтесь через форму обратной связи в Сервисе.
            </p>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
            <p>Дата публикации: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}