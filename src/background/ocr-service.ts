import Tesseract from 'tesseract.js';

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function performOcr(imageUrl: string, lang: 'eng' | 'rus' = 'eng'): Promise<OcrResult> {
  try {
    const { data } = await Tesseract.recognize(
      imageUrl,
      lang,
      {
        logger: m => console.log('[OCR]', m),
      }
    );
    
    return {
      text: data.text,
      confidence: data.confidence
    };
  } catch (error) {
    console.error('[OCR] Error:', error);
    throw new Error(`OCR failed: ${(error as Error).message}`);
  }
}
