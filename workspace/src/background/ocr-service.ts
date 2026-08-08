import { createWorker } from 'tesseract.js';

export async function performOCR(imageUrl: string): Promise<string> {
  const worker = await createWorker('rus+eng');
  try {
    const ret = await worker.recognize(imageUrl);
    await worker.terminate();
    return ret.data.text;
  } catch (e) {
    await worker.terminate();
    throw e;
  }
}
