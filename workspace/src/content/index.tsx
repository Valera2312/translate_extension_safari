import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Создаем контейнер в Shadow DOM для изоляции стилей
const host = document.createElement('div');
host.id = 'deepl-extension-host';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });

const root = createRoot(shadow as any);
root.render(<App />);

// Слушаем сообщения от Background
chrome.runtime.onMessage.addListener((req, _, sendResp) => {
  const event = new CustomEvent('deepl-message', { detail: req });
  shadow.dispatchEvent(event);
  sendResp({ received: true });
});
