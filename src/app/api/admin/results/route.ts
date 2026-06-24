import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRedis } from "@/lib/redis";
import type { ExamResult } from "@/lib/types";

export const runtime = "nodejs";

function checkAuth(): boolean {
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) return false;
  const c = cookies().get("admin_session");
  return c?.value === adminPwd;
}

export async function GET() {
  if (!checkAuth()) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const redis = getRedis();
    const ids = (await redis.get<string[]>("results")) || [];
    const results: ExamResult[] = [];
    for (const id of ids) {
      const r = await redis.get<ExamResult>(`result:${id}`);
      if (r) results.push(r);
    }
    // 倒序：新 → 旧
    results.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
