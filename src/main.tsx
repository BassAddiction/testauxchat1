import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Автоматически скрываем адресную строку на мобильных
const hideAddressBar = () => {
  // Используем requestAnimationFrame для более надежного выполнения
  requestAnimationFrame(() => {
    window.scrollTo({
      top: 1,
      left: 0,
      behavior: 'auto'
    });
  });
};

// Вызываем при загрузке страницы
window.addEventListener('load', () => {
  setTimeout(hideAddressBar, 300);
  setTimeout(hideAddressBar, 500);
  setTimeout(hideAddressBar, 1000);
});

// При изменении ориентации
window.addEventListener('orientationchange', () => {
  setTimeout(hideAddressBar, 300);
});

// При изменении размера окна (когда клавиатура появляется/скрывается)
let lastHeight = window.innerHeight;
window.addEventListener('resize', () => {
  const currentHeight = window.innerHeight;
  // Только если высота увеличилась (клавиатура скрылась)
  if (currentHeight > lastHeight) {
    setTimeout(hideAddressBar, 100);
  }
  lastHeight = currentHeight;
});

// Сразу после монтирования React-приложения
setTimeout(hideAddressBar, 100);

createRoot(document.getElementById("root")!).render(<App />);