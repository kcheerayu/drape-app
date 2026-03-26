import { NextRequest, NextResponse } from "next/server";
import { CATALOG } from "@/data/catalog";
import type { GarmentCategory } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as GarmentCategory | null;

  const items = category
    ? CATALOG.filter((item) => item.category === category)
    : CATALOG;

  return NextResponse.json({ items, total: items.length });
}