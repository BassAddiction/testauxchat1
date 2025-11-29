import { useEffect, useRef } from 'react';

interface TelegramLoginButtonProps {
  botUsername: string;
  onAuth: (user: any) => void;
}

const TelegramLoginButton = ({ botUsername, onAuth }: TelegramLoginButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    (window as any).onTelegramAuth = onAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  return <div ref={containerRef} className="flex justify-center" />;
};

export default TelegramLoginButton;
