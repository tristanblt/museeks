/**
 * Fake album art: a gradient whose colors depend on the track path
 */
export async function getCover(path: string): Promise<string | null> {
  let hash = 0;
  for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hash},70%,60%)"/><stop offset="1" stop-color="hsl(${(hash + 60) % 360},65%,35%)"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
