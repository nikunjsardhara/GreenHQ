import { ImageResponse } from "next/og";
import { getDb } from "@/db";
import { gifts } from "@/db/schema";
import { scopeAlive } from "@/lib/tenant";
import { and, eq } from "drizzle-orm";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG preview for gift share links, PRD §5.6.
export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let to = "Someone you love";
  try {
    const gift = await getDb().query.gifts.findFirst({
      where: and(eq(gifts.shareToken, token), scopeAlive(gifts.deletedAt)),
    });
    if (gift) to = gift.recipientName;
  } catch {
    /* generic card */
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#1a2b1f" }}>
        <div style={{ display: "flex", fontSize: 40, color: "#cfe0d2" }}>GreenHQ · a tree was gifted</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#ffffff" }}>For {to}</div>
      </div>
    ),
    { ...size },
  );
}
