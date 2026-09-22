import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { parseTarget } from "@/lib/parse";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const target = parseTarget(q);
  redirect(target ?? `/?error=${encodeURIComponent(q)}`);
}
