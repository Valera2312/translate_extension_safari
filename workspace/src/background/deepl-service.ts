export interface DeepLUsage {
  character_count: number;
  character_limit: number;
}

export class DeepLError extends Error {
  constructor(message: string, public readonly code?: number) {
    super(message);
    this.name = 'DeepLError';
  }
}

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function validateApiKey(apiKey: string): Promise<DeepLUsage> {
  const isFreeKey = apiKey.endsWith(':fx');
  const url = isFreeKey ? 'https://api-free.deepl.com/v2/usage' : 'https://api.deepl.com/v2/usage';

  const response = await fetch(url, {
    headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}` }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new DeepLError(err.message || `Ошибка: ${response.status}`, response.status);
  }
  return response.json();
}

function chunkTexts(texts: string[], maxChars = 4500): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let len = 0;

  for (const text of texts) {
    if (text.length > maxChars) {
      if (current.length) chunks.push(current);
      chunks.push([text]);
      current = [];
      len = 0;
      continue;
    }
    if (len + text.length > maxChars) {
      chunks.push(current);
      current = [text];
      len = text.length;
    } else {
      current.push(text);
      len += text.length;
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export async function translateTexts(
  texts: string[],
  targetLang: 'EN' | 'RU',
  sourceLang?: 'EN' | 'RU'
): Promise<string[]> {
  const apiKeyRes = await chrome.storage.local.get(['deeplApiKey']);
  const apiKey = apiKeyRes.deeplApiKey;
  if (!apiKey) throw new DeepLError('API ключ не найден', 401);

  const isFree = apiKey.endsWith(':fx');
  const url = isFree ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
  
  // Кэширование (упрощенное)
  const cachePrefix = `tr_${targetLang}_${sourceLang || 'auto'}_`;
  const allCache = await chrome.storage.local.get(null);
  const results: (string | null)[] = [];
  const toFetch: { idx: number; text: string }[] = [];

  texts.forEach((t, i) => {
    const key = `${cachePrefix}${hashCode(t)}`;
    if (allCache[key]) {
      results[i] = allCache[key];
    } else {
      results[i] = null;
      toFetch.push({ idx: i, text: t });
    }
  });

  if (toFetch.length === 0) return results as string[];

  const chunks = chunkTexts(toFetch.map(x => x.text));
  const translatedChunks: string[][] = [];

  for (const chunk of chunks) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: chunk,
            target_lang: targetLang,
            source_lang: sourceLang,
            tag_handling: 'text' // Требование: text format
          })
        });

        if (res.status === 429 || res.status === 503) {
           throw new DeepLError('Rate limit', res.status);
        }
        if (!res.ok) throw new DeepLError(`API Error ${res.status}`, res.status);

        const data = await res.json();
        translatedChunks.push(data.translations.map((t: any) => t.text));
        break;
      } catch (e: any) {
        attempt++;
        if (attempt >= MAX_RETRIES || e.code === 456) throw e;
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
      }
    }
  }

  // Сборка и сохранение в кэш
  const finalRes = [...results] as string[];
  let flatIdx = 0;
  for (const chunkRes of translatedChunks) {
    for (const trText of chunkRes) {
      const orig = toFetch[flatIdx];
      const key = `${cachePrefix}${hashCode(orig.text)}`;
      await chrome.storage.local.set({ [key]: trText });
      finalRes[orig.idx] = trText;
      flatIdx++;
    }
  }

  return finalRes;
}
