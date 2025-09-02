import { redis } from "@/lib/redis";

const WARPCAST_API = "https://api.warpcast.com/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Warpcast error ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}

export async function getFidByUsername(handle: string): Promise<number | null> {
  const username = handle.replace(/^@+/, "").trim().toLowerCase();
  if (!username) return null;
  const cacheKey = `warpcast:fid:username:${username}`;
  try {
    if (redis) {
      const cached = await redis.get<number>(cacheKey);
      if (cached) return cached;
    }
  } catch {}
  type Resp = { result?: { user?: { fid?: number } } };
  const data = await fetchJson<Resp>(
    `${WARPCAST_API}/user-by-username?username=${encodeURIComponent(username)}`,
  );
  const fid = data?.result?.user?.fid ?? null;
  if (fid && redis) await redis.set(cacheKey, fid, { ex: 60 * 60 * 12 });
  return fid;
}

export type WarpcastUser = {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
};

export async function getUserByFid(fid: number): Promise<WarpcastUser | null> {
  const cacheKey = `warpcast:profile:fid:${fid}`;
  try {
    if (redis) {
      const cached = await redis.get<WarpcastUser>(cacheKey);
      if (cached) return cached;
    }
  } catch {}
  type Resp = {
    result?: {
      user?: {
        fid: number;
        username?: string;
        displayName?: string;
        pfp?: { url?: string };
      };
    };
  };
  const data = await fetchJson<Resp>(`${WARPCAST_API}/user?fid=${fid}`);
  const u = data?.result?.user;
  if (!u) return null;
  const user: WarpcastUser = {
    fid: u.fid,
    username: u.username,
    display_name: u.displayName,
    pfp_url: u.pfp?.url,
  };
  if (redis) await redis.set(cacheKey, user, { ex: 60 * 60 * 6 });
  return user;
}

