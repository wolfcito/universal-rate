import { redis } from "@/lib/redis";

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) throw new Error("NEYNAR_API_KEY is not set");
  return key;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "accept": "application/json",
      "api-key": getApiKey(),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neynar error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function resolveHandleToFid(handle: string): Promise<number | null> {
  const username = handle.replace(/^@+/, "").trim().toLowerCase();
  if (!username) return null;
  const cacheKey = `neynar:fid:username:${username}`;
  try {
    if (redis) {
      const cached = await redis.get<number>(cacheKey);
      if (cached) return cached;
    }
  } catch {}

  type UserByUsername = { user?: { fid?: number } };
  const data = await fetchJson<UserByUsername>(
    `${NEYNAR_API}/user/by-username?username=${encodeURIComponent(username)}`,
  );
  const fid = data?.user?.fid;
  if (fid && redis) await redis.set(cacheKey, fid, { ex: 60 * 60 * 12 }); // 12h
  return fid ?? null;
}

export async function resolveCastUrlToAuthorFid(url: string): Promise<number | null> {
  const cacheKey = `neynar:fid:casturl:${url}`;
  try {
    if (redis) {
      const cached = await redis.get<number>(cacheKey);
      if (cached) return cached;
    }
  } catch {}

  type CastResp = { cast?: { author?: { fid?: number } } };
  const data = await fetchJson<CastResp>(
    `${NEYNAR_API}/cast?identifier=${encodeURIComponent(url)}&type=url`,
  );
  const fid = data?.cast?.author?.fid;
  if (fid && redis) await redis.set(cacheKey, fid, { ex: 60 * 60 * 12 });
  return fid ?? null;
}

export async function resolveTargetToFid(params: {
  ratedFid?: number | string | null;
  handle?: string | null;
  castUrl?: string | null;
}): Promise<number | null> {
  const { ratedFid, handle, castUrl } = params;
  if (ratedFid && !Number.isNaN(Number(ratedFid))) return Number(ratedFid);
  if (castUrl && /^https?:\/\//i.test(castUrl)) {
    const fid = await resolveCastUrlToAuthorFid(castUrl);
    if (fid) return fid;
  }
  if (handle && handle.trim()) {
    const fid = await resolveHandleToFid(handle);
    if (fid) return fid;
  }
  return null;
}

