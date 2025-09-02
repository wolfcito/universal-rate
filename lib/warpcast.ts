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

export type WarpcastVerification = {
  address: string;
  protocol?: string;
  isPrimary?: boolean;
  labels?: string[];
};

export type WarpcastUser = {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
  custody_address?: string | null;
  verifications?: WarpcastVerification[];
};

export async function getUserByFid(fid: number): Promise<WarpcastUser | null> {
  const cacheKey = `warpcast:profile:fid:${fid}`;
  try {
    if (redis) {
      const cached = await redis.get<WarpcastUser>(cacheKey);
      if (cached) {
        // If cached verifications are missing or in legacy format (string[]), enrich/upgrade from API
        const first = (cached.verifications as unknown[] | undefined)?.[0];
        const needsUpgrade = Array.isArray(cached.verifications) && typeof first === "string";
        const hasAny = Array.isArray(cached.verifications) && typeof first === "object" && first !== null;
        if (!hasAny || needsUpgrade) {
          try {
            const vers = await getVerificationsByFid(fid);
            if (vers && vers.length) {
              cached.verifications = vers;
              await redis.set(cacheKey, cached, { ex: 60 * 60 * 2 });
            }
          } catch {}
        }
        return cached;
      }
    }
  } catch {}
  type Resp = {
    result?: {
      user?: {
        fid: number;
        username?: string;
        displayName?: string;
        pfp?: { url?: string };
        custodyAddress?: string;
        verifications?: string[];
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
    custody_address: u.custodyAddress ?? null,
    verifications: Array.isArray(u.verifications)
      ? u.verifications
          .filter((addr): addr is string => typeof addr === "string" && !!addr)
          .map((addr) => ({ address: addr }))
      : [],
  };
  try {
    // Enrich with explicit verifications endpoint(s)
    const vers = await getVerificationsByFid(fid);
    if (vers && vers.length) {
      user.verifications = vers;
    }
  } catch {}
  if (redis) await redis.set(cacheKey, user, { ex: 60 * 60 * 2 });
  return user;
}

export async function getVerificationsByFid(fid: number): Promise<WarpcastVerification[] | null> {
  const cacheKey = `warpcast:verifications:fid:${fid}`;
  try {
    if (redis) {
      const cached = await redis.get<WarpcastVerification[]>(cacheKey);
      if (cached) return cached;
    }
  } catch {}

  // Try common endpoints for verifications
  // 1) /v2/verifications?fid=
  try {
    type Resp1 = { result?: { verifications?: Array<{ address: string; protocol?: string; isPrimary?: boolean; labels?: string[] }> } };
    const r1 = await fetchJson<Resp1>(`${WARPCAST_API}/verifications?fid=${fid}`);
    const arr1 = r1?.result?.verifications;
    if (Array.isArray(arr1) && arr1.length) {
      const norm = arr1.map((v) => ({
        address: v.address,
        protocol: v.protocol,
        isPrimary: v.isPrimary,
        labels: Array.isArray(v.labels) ? v.labels : undefined,
      }));
      if (redis) await redis.set(cacheKey, norm, { ex: 60 * 60 * 6 });
      return norm;
    }
  } catch {}

  // 2) /v2/user-verifications?fid=
  try {
    type Resp2 = { result?: { verifications?: Array<{ address?: string }> } };
    const r2 = await fetchJson<Resp2>(`${WARPCAST_API}/user-verifications?fid=${fid}`);
    const arr2 = (r2?.result?.verifications || [])
      .map((v) => v.address!)
      .filter(Boolean)
      .map((addr) => ({ address: addr } as WarpcastVerification));
    if (arr2.length) {
      if (redis) await redis.set(cacheKey, arr2, { ex: 60 * 60 * 6 });
      return arr2;
    }
  } catch {}

  return null;
}
