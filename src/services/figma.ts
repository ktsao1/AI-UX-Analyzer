import { buildPrototype, type FigmaNode } from '../lib/prototype';
import type { Prototype, ScreenImage, ScreenSource } from '../lib/types';

const API = 'https://api.figma.com/v1';

async function figmaGet<T>(path: string, token: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { headers: { 'X-Figma-Token': token }, signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach Figma. Check your connection and try again.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { err?: string; message?: string };
    if (response.status === 403) throw new Error('Figma refused the token. Check that it is valid, has read access to file content, and that your account can open this file.');
    if (response.status === 404) throw new Error('Figma could not find that file. Check the link, and that your account can open it.');
    if (response.status === 429) throw new Error('Figma is rate limiting this token. Wait a minute and try again.');
    throw new Error(body.err || body.message || `Figma returned an error (${response.status}).`);
  }
  return (await response.json()) as T;
}

/** Read a file and turn it into screens, hotspots and flows. */
export async function fetchPrototype(fileKey: string, token: string, signal?: AbortSignal): Promise<Prototype> {
  const file = await figmaGet<{ name: string; document: FigmaNode }>(`/files/${encodeURIComponent(fileKey)}`, token, signal);
  return buildPrototype(file.document, file.name);
}

/** Figma renders at 2x here; the model does not need that many pixels, so
 *  the picture is drawn at 1x and sent as JPEG. Smaller requests, faster
 *  replies. */
async function toBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width / 2));
  canvas.height = Math.max(1, Math.round(bitmap.height / 2));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the screen image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mimeType: 'image/jpeg' };
}

export interface FigmaScreens extends ScreenSource {
  /** Ask Figma for many screens' pictures in one request. Returns each
   *  screen's image URL, for thumbnails. */
  prefetch(screenIds: string[], signal?: AbortSignal): Promise<Record<string, string>>;
}

/** Screen pictures from Figma's image API, each fetched once. */
export function createFigmaScreens(fileKey: string, token: string): FigmaScreens {
  const urls = new Map<string, string>();
  const images = new Map<string, Promise<ScreenImage>>();

  async function requestUrls(ids: string[], signal?: AbortSignal) {
    const missing = ids.filter((id) => !urls.has(id));
    // Figma accepts a list of ids; keep each request to a sensible size.
    for (let i = 0; i < missing.length; i += 40) {
      const batch = missing.slice(i, i + 40);
      const data = await figmaGet<{ err?: string | null; images: Record<string, string | null> }>(
        `/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(batch.join(','))}&format=png&scale=2`, token, signal,
      );
      if (data.err) throw new Error(data.err);
      for (const id of batch) {
        const url = data.images?.[id];
        if (url) urls.set(id, url);
      }
    }
  }

  return {
    async prefetch(screenIds, signal) {
      await requestUrls(screenIds, signal);
      return Object.fromEntries(screenIds.filter((id) => urls.has(id)).map((id) => [id, urls.get(id)!]));
    },
    getImage(screenId, signal) {
      const cached = images.get(screenId);
      if (cached) return cached;
      const pending = (async () => {
        await requestUrls([screenId], signal);
        const url = urls.get(screenId);
        if (!url) throw new Error('Figma did not return a picture for one of the screens. It may be empty or hidden.');
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Could not download a screen image (${response.status}).`);
        return { url, ...(await toBase64(await response.blob())) };
      })();
      images.set(screenId, pending);
      // A failed or cancelled fetch should be retried next time, not remembered.
      pending.catch(() => images.delete(screenId));
      return pending;
    },
  };
}
