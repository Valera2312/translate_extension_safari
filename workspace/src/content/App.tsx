import React, { useEffect, useState } from 'react';
import { collectTextNodes, restoreOriginal } from './utils/dom-parser';
import './styles.css';

export default function App() {
  const [status, setStatus] = useState<'idle' | 'translating' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [usage, setUsage] = useState<{count: number, limit: number} | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      const req = e.detail;
      if (req.action === 'START_TRANSLATION') startTranslation();
      if (req.action === 'SHOW_KEY_REQUEST') setNeedKey(true);
      if (req.action === 'SHOW_ERROR') {
        setStatus('error');
        setErrorMsg(req.payload);
      }
      if (req.action === 'START_OCR') handleOCR(req.payload.src);
    };
    
    // @ts-ignore
    shadowRoot?.addEventListener('deepl-message', handler);
    return () => {
        // @ts-ignore
        shadowRoot?.removeEventListener('deepl-message', handler);
    };
  }, []);

  const startTranslation = async () => {
    setStatus('translating');
    setProgress(0);
    setShowOriginal(false);
    
    const nodes = collectTextNodes(document.body);
    const texts = nodes.map(n => n.textContent || '').filter(t => t.trim().length > 0);
    
    // Разбиваем на батчи для прогресс бара
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      try {
        const res = await chrome.runtime.sendMessage({
          action: 'TRANSLATE_CHUNKS',
          texts: batch,
          targetLang: 'RU', // Фиксировано
          sourceLang: 'EN'
        });
        
        if (!res.success) throw new Error(res.error);
        
        // Применяем перевод (упрощенно: ищем узлы по индексу)
        // В реальном коде нужна более сложная маппинг логика
        batch.forEach((trText, idx) => {
           const nodeIndex = i + idx;
           if (nodes[nodeIndex]) {
             (nodes[nodeIndex] as any)._originalText = nodes[nodeIndex].textContent;
             nodes[nodeIndex].textContent = trText;
           }
        });
        
        setProgress(Math.min(100, Math.round(((i + batchSize) / texts.length) * 100)));
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message);
        return;
      }
    }
    setStatus('done');
  };

  const handleOCR = async (url: string) => {
      setStatus('translating');
      try {
          const res = await chrome.runtime.sendMessage({ action: 'PERFORM_OCR', imageUrl: url });
          if (!res.success) throw new Error(res.error);
          alert(`Распознанный текст:\n${res.text}`);
          setStatus('idle');
      } catch (e: any) {
          setStatus('error');
          setErrorMsg(e.message);
      }
  };

  const saveKey = async () => {
      const res = await chrome.runtime.sendMessage({ action: 'SAVE_API_KEY', key: apiKeyInput });
      if (res.success) {
          setNeedKey(false);
          setUsage(res.usage);
          alert('Ключ сохранен успешно!');
      } else {
          alert('Ошибка ключа: ' + res.error);
      }
  };
  
  const toggleView = () => {
      if (showOriginal) {
          // Восстановление (упрощенно)
          const nodes = document.querySelectorAll('[data-deepl-original]');
          nodes.forEach(n => n.textContent = n.getAttribute('data-deepl-original'));
          setShowOriginal(false);
      } else {
          // Логика скрытия оригинала (тут должна быть обратная логика)
          setShowOriginal(true);
      }
  };

  if (needKey) {
      return (
          <div className="dl-modal">
              <h3>Введите DeepL API Key</h3>
              <input value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Key..." />
              <button onClick={saveKey}>Сохранить</button>
          </div>
      );
  }

  if (status === 'translating') {
      return (
          <div className="dl-panel">
              <div className="dl-spinner"></div>
              <span>Перевод: {progress}%</span>
          </div>
      );
  }

  if (status === 'error') {
      return (
          <div className="dl-panel dl-error">
              <span>Ошибка: {errorMsg}</span>
              <button onClick={() => setStatus('idle')}>Закрыть</button>
          </div>
      );
  }

  if (status === 'done') {
      return (
          <div className="dl-panel">
              <span>Готово!</span>
              <button onClick={toggleView}>{showOriginal ? 'Показать перевод' : 'Оригинал'}</button>
              <button onClick={() => setStatus('idle')}>Скрыть</button>
          </div>
      );
  }

  return null;
}
