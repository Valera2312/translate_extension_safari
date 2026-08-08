import { validateApiKey, translateTexts, DeepLError } from './deepl-service';
import { performOCR } from './ocr-service';

// Установка контекстного меню
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translate-page",
    title: "Перевести страницу (RU ↔ EN)",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "translate-image",
    title: "Распознать и перевести текст (OCR)",
    contexts: ["image"]
  });
});

// Обработка клика по меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab.id) return;

  if (info.menuItemId === "translate-page") {
    // Проверка ключа перед запуском
    const apiKey = await getApiKey();
    if (!apiKey) {
      chrome.tabs.sendMessage(tab.id, { action: "SHOW_KEY_REQUEST" });
      return;
    }
    
    try {
      await validateApiKey(apiKey);
      chrome.tabs.sendMessage(tab.id, { action: "START_TRANSLATION" });
    } catch (e) {
      chrome.tabs.sendMessage(tab.id, { 
        action: "SHOW_ERROR", 
        payload: "Неверный API ключ или лимиты исчерпаны. Проверьте настройки." 
      });
    }
  } else if (info.menuItemId === "translate-image") {
    chrome.tabs.sendMessage(tab.id, { 
      action: "START_OCR", 
      payload: { src: info.srcUrl } 
    });
  }
});

// Обработка сообщений от Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SAVE_API_KEY") {
    validateApiKey(request.key)
      .then(usage => {
        chrome.storage.local.set({ deeplApiKey: request.key, usageInfo: usage });
        sendResponse({ success: true, usage });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Асинхронный ответ
  }

  if (request.action === "TRANSLATE_CHUNKS") {
    translateTexts(request.texts, request.targetLang, request.sourceLang)
      .then(results => sendResponse({ success: true, results }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "PERFORM_OCR") {
    performOCR(request.imageUrl)
      .then(text => sendResponse({ success: true, text }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === "GET_USAGE") {
     chrome.storage.local.get(['usageInfo']).then(res => {
         sendResponse(res.usageInfo);
     });
     return true;
  }
});

async function getApiKey(): Promise<string | null> {
  const res = await chrome.storage.local.get(['deeplApiKey']);
  return res.deeplApiKey || null;
}
