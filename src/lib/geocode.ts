import type { Place } from '@shared/types';
import { LONDON_PLACES } from '@shared/data/london';
import { LONDON_OUTCODES } from '@shared/data/outcodes';
import { fetchOrUndefined } from '@/lib/net';

export const POSTCODE = /^\s*([a-z]{1,2}\d[a-z\d]?)\s*(\d[a-z]{2})?\s*$/i;

/** London areas matching what's typed (offline). */
export function searchPlaces(q: string, limit = 8): Place[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return LONDON_PLACES.filter((p) => p.name.toLowerCase().includes(t) || p.aliases?.some((a) => a.includes(t)))
    .slice(0, limit)
    .map((p) => ({ name: p.name, position: p.position, address: 'London' }));
}

/** Bundled London postcode district, used when postcodes.io cannot be reached. */
export function offlinePostcode(query: string): Place | undefined {
  const m = query.trim().match(POSTCODE) ?? query.match(/\b([a-z]{1,2}\d[a-z\d]?)\s*(\d[a-z]{2})?\b/i);
  if (!m) return undefined;
  const out = m[1].toUpperCase();
  const hit = LONDON_OUTCODES[out];
  if (!hit) return undefined;
  const name = m[2] ? `${out} ${m[2].toUpperCase()}` : out;
  return { name, position: hit.position, address: `${hit.area} · approximate` };
}

/** London areas first (offline), then UK postcodes via postcodes.io (free, no key) when online. */
export async function geocode(query: string): Promise<Place | undefined> {
  const local = searchPlaces(query, 1)[0];
  if (local && local.name.toLowerCase() === query.trim().toLowerCase()) return local;
  const m = query.match(POSTCODE) ?? query.match(/\b([a-z]{1,2}\d[a-z\d]?)\s*(\d[a-z]{2})\b/i);
  if (!m) return local;
  const bundled = offlinePostcode(query);
  const url = m[2]
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(`${m[1]}${m[2]}`)}`
    : `https://api.postcodes.io/outcodes/${encodeURIComponent(m[1])}`;
  const res = await fetchOrUndefined(url, 5000);
  if (!res?.ok) return bundled ?? local;
  try {
    const r = (await res.json()).result;
    if (!r?.longitude) return bundled ?? local;
    const name = (m[2] ? `${m[1]} ${m[2]}` : m[1]).toUpperCase();
    return { name, position: [r.longitude, r.latitude], address: r.admin_district ? `${name}, ${r.admin_district}` : name };
  } catch {
    return bundled ?? local;
  }
}
