import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const restaurantName = slug.replace(/-/g, " ");
  const itemName = itemId.replace(/-/g, " ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#006b5f",
          color: "#fbfaf7",
          padding: 64,
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 34, fontWeight: 700, textTransform: "capitalize" }}>{restaurantName}</div>
          <div style={{ marginTop: 20, fontSize: 84, fontWeight: 900, lineHeight: 1 }}>
            <span style={{ textTransform: "capitalize" }}>{itemName}</span>
          </div>
          <div style={{ marginTop: 24, fontSize: 34 }}>
            Tap to order direct - offer auto-applies
          </div>
        </div>
      </div>
    ),
    size,
  );
}
