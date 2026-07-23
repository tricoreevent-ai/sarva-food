import { NextResponse } from "next/server";
import { menuItemPath } from "@/lib/menu-item-links";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { slug, itemId } = await params;
  return NextResponse.redirect(new URL(`${menuItemPath(slug, itemId)}?source=share`, request.url), 307);
}
