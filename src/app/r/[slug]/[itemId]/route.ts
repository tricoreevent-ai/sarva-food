import { NextResponse } from "next/server";
import { menuItemPath } from "@/lib/menu-item-links";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { slug, itemId } = await params;
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `${menuItemPath(slug, itemId)}?source=share`,
    },
  });
}
