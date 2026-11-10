/** Path on this deployment: `/` in local dev, `/relay/` on GitHub Pages. */
export function sitePath(path = ''): string {
  const base = import.meta.env.BASE_URL;
  const rel = path.replace(/^\//, '');
  return rel ? `${base}${rel}` : base;
}
