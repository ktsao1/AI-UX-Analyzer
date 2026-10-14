import type { GoogleGenAI } from '@google/genai';
import type { ModelClient } from '../lib/types';

const RETRIES = 3;

const statusOf = (error: unknown): number | undefined => {
  const e = error as { status?: number; code?: number; error?: { code?: number } };
  return [e?.status, e?.code, e?.error?.code].find((n): n is number => typeof n === 'number');
};

function friendly(error: unknown): Error {
  const status = statusOf(error);
  const message = error instanceof Error ? error.message : String(error);
  if (status === 400 && /api key/i.test(message)) return new Error('Gemini rejected the API key. Check it in Settings.');
  if (status === 401 || status === 403) return new Error('Gemini rejected the API key. Check it in Settings.');
  if (status === 404) return new Error('Gemini does not know that model name. Check the model in Settings.');
  if (status === 429) return new Error('Gemini rate limit reached. Wait a minute, or run fewer passes.');
  if (status && status >= 500) return new Error('Gemini is overloaded or unavailable right now. Try again shortly.');
  return new Error(message || 'Gemini returned an error.');
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/** Gemini behind the tool's one-method model interface. Each call is
 *  independent (no chat session), so the run loop decides exactly what the
 *  model is told. Rate-limit and server errors are retried with a growing
 *  wait; anything else is reported straight away. */
export function createGeminiModel(apiKey: string, model: string): ModelClient {
  // The SDK is loaded on first use, so the sample mode never downloads it.
  let client: Promise<GoogleGenAI> | null = null;
  const sdk = () => (client ??= import('@google/genai').then((m) => new m.GoogleGenAI({ apiKey })));
  return {
    async generate(request) {
      const ai = await sdk();
      const parts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: request.prompt }];
      if (request.kind === 'step') {
        if (!request.image.base64 || !request.image.mimeType) throw new Error('The screen image was not prepared for the model.');
        parts.push({ inlineData: { data: request.image.base64, mimeType: request.image.mimeType } });
      }
      let last: unknown;
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        if (request.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: { abortSignal: request.signal },
          });
          const text = response.text;
          if (!text) throw new Error('Gemini returned an empty reply.');
          return text;
        } catch (error) {
          if (request.signal?.aborted) throw error;
          last = error;
          const status = statusOf(error);
          const retryable = status === 429 || (status !== undefined && status >= 500);
          if (!retryable || attempt === RETRIES) break;
          await sleep(Math.min(1500 * 2 ** (attempt - 1), 10000), request.signal);
        }
      }
      throw friendly(last);
    },
  };
}
