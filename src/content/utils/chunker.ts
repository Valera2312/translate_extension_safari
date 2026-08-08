/**
 * Разбивает массив текстов на группы для отправки в API.
 */
export function createChunks(texts: string[], maxChars = 4000, maxItems = 40): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const text of texts) {
    if (text.length > maxChars) {
      if (currentChunk.length > 0) chunks.push(currentChunk);
      currentChunk = [text];
      currentLength = text.length;
      continue;
    }

    if (currentChunk.length >= maxItems || currentLength + text.length > maxChars) {
      chunks.push(currentChunk);
      currentChunk = [text];
      currentLength = text.length;
    } else {
      currentChunk.push(text);
      currentLength += text.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
