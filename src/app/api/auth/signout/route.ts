import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("back") ?? "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const response = NextResponse.redirect(new URL(back, request.url));
  response.cookies.delete(sessionCookie.name);
  return response;
}
