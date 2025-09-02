import { redis } from "@/lib/redis";

const NEYNAR_API = "https://api.neynar.com/v2/farcaster";

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) throw new Error("NEYNAR_API_KEY is not set");
  return key;
}

async function fetchJson<T>(url: string): Promise<T> {
  const key = getApiKey();
  const hasQuery = url.includes("?");
  const hasApiKeyParam = /[?&]api_key=/.test(url);
  const finalUrl = hasApiKeyParam ? url : `${url}${hasQuery ? "&" : "?"}api_key=${encodeURIComponent(key)}`;

  const res = await fetch(finalUrl, {
    headers: {
      accept: "application/json",
      // Try multiple common header variants just in case
      "api-key": key,
      "api_key": key,
      "x-api-key": key,
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
  // Gate paid endpoint behind env flag; default off for free plan UX
  if (process.env.NEYNAR_ALLOW_CAST_URL !== "1") {
    return null;
  }
  // Fast path: parse Warpcast URL to extract username and resolve via by-username (likely on free tier)
  try {
    const u = new URL(url);
    if (u.hostname.includes("warpcast.com")) {
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs.length >= 1) {
        const username = segs[0];
        if (username && username !== "~") {
          const viaHandle = await resolveHandleToFid(username.startsWith("@") ? username : `@${username}`);
          if (viaHandle) return viaHandle;
        }
      }
    }
  } catch {
    // Ignore parse errors, fall back to API
  }

  const cacheKey = `neynar:fid:casturl:${url}`;
  try {
    if (redis) {
      const cached = await redis.get<number>(cacheKey);
      if (cached) return cached;
    }
  } catch {}

  type CastResp = { cast?: { author?: { fid?: number } } };
  try {
    const data = await fetchJson<CastResp>(
      `${NEYNAR_API}/cast?identifier=${encodeURIComponent(url)}&type=url`,
    );
    const fid = data?.cast?.author?.fid;
    if (fid && redis) await redis.set(cacheKey, fid, { ex: 60 * 60 * 12 });
    return fid ?? null;
  } catch (e: unknown) {
    // If plan doesn't allow this endpoint, just return null to let caller decide UX
    if (e instanceof Error && e.message.includes("PaymentRequired")) {
      return null;
    }
    throw e;
  }
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

export type NeynarUser = {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
};

export async function getUserByFid(fid: number): Promise<NeynarUser | null> {
  const cacheKey = `neynar:profile:fid:${fid}`;
  try {
    if (redis) {
      const cached = await redis.get<NeynarUser>(cacheKey);
      if (cached) return cached;
    }
  } catch {}

  type Resp = { user?: { fid: number; username?: string; display_name?: string; pfp_url?: string } };
  const data = await fetchJson<Resp>(`${NEYNAR_API}/user/by-fid?fid=${fid}`);
  const u = data?.user;
  if (!u) return null;
  const user: NeynarUser = {
    fid: u.fid,
    username: u.username,
    display_name: u.display_name,
    pfp_url: u.pfp_url,
  };
  if (redis) await redis.set(cacheKey, user, { ex: 60 * 60 * 6 }); // 6h
  return user;
}
