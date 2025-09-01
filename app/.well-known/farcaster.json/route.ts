import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const homeUrl = process.env.NEXT_PUBLIC_URL || "";
  const iconUrl =
    process.env.NEXT_PUBLIC_APP_ICON ||
    process.env.NEXT_PUBLIC_ICON_URL ||
    (homeUrl ? new URL("/icon.png", homeUrl).toString() : "/icon.png");
  const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || (homeUrl ? new URL("/api/webhook", homeUrl).toString() : undefined);

  const body: any = {
    miniapp: {
      version: "1",
      homeUrl,
      iconUrl,
    },
  };
  if (webhookUrl) body.miniapp.webhookUrl = webhookUrl;

  return NextResponse.json(body);
}

