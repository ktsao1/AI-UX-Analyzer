export interface FigmaLink {
  fileKey: string;
  nodeId: string;
}

/** Read the file key and node id out of a Figma link. Accepts /file/,
 *  /design/ and /proto/ links, and branch links (the branch key is the file
 *  to read). Node ids arrive as `12-34` in the URL and are `12:34` in the
 *  API; nested instance ids look like `I12-34;56-78`, so every dash between
 *  digits is converted, not just the first. */
export function parseFigmaUrl(input: string): FigmaLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)figma\.com$/.test(url.hostname)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const kindIndex = parts.findIndex((p) => p === 'file' || p === 'design' || p === 'proto');
  if (kindIndex === -1 || !parts[kindIndex + 1]) return null;

  let fileKey = parts[kindIndex + 1];
  const branchIndex = parts.indexOf('branch');
  if (branchIndex !== -1 && parts[branchIndex + 1]) fileKey = parts[branchIndex + 1];

  const rawNode = url.searchParams.get('node-id') ?? url.searchParams.get('starting-point-node-id');
  if (!rawNode) return null;
  const nodeId = decodeURIComponent(rawNode).replace(/(\d)-(\d)/g, '$1:$2');

  return { fileKey, nodeId };
}
