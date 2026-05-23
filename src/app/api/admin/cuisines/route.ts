import { NextResponse } from "next/server";
import { singleCuisineOptions } from "@/lib/single-restaurant-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    cuisines: singleCuisineOptions.map((name) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      enabled: true,
    })),
  });
}
