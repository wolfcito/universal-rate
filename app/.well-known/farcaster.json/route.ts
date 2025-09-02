export const runtime = "edge";

function baseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/$/, "");
  // Fallback to deployed URL if provided by Vercel
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  // Final fallback (keeps current behavior)
  return "https://universal-rate.vercel.app";
}

export async function GET() {
  const url = baseUrl();
  const header = process.env.FARCASTER_HEADER || "";
  const payload = process.env.FARCASTER_PAYLOAD || "";
  const signature = process.env.FARCASTER_SIGNATURE || "";
  const allowedEnv =
    process.env.BASE_BUILDER_ALLOWED_ADDRESSES ||
    process.env.FARCASTER_BASE_BUILDER_ALLOWED_ADDRESSES ||
    "";
  const allowedAddresses = allowedEnv
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const body = {
    frame: {
      name: "Universal Rate",
      version: "1",
      iconUrl: `${url}/icon.jpeg`,
      homeUrl: url,
      imageUrl: `${url}/image.png`,
      buttonTitle: "Notch it!",
      splashImageUrl: `${url}/splash.png`,
      splashBackgroundColor: "#FFFFFF",
      webhookUrl: `${url}/api/webhook`,
      subtitle: "Grow your reputation",
      description:
        "Rate -> Unlock -> Share -> Rise. Build real reputation weekly.",
      primaryCategory: "social",
      screenshotUrls: [`${url}/screenshot.png`],
      tags: ["ratings", "social", "miniapp"],
      ogTitle: "Universal Rate",
    },
    accountAssociation: {
      header,
      payload,
      signature,
    },
    baseBuilder: {
      allowedAddresses,
    },
  };

  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
