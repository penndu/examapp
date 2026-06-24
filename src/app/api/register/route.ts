import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();
    if (!name || !phone) {
      return NextResponse.json({ error: "姓名和手机号不能为空" }, { status: 400 });
    }
    if (!/^1[3-9]\d{9}$/.test(String(phone))) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
    }
    const redis = getRedis();
    const userKey = `user:${phone}`;
    const existing = await redis.get<{ name: string; phone: string; attempts?: number }>(userKey);
    if (existing) {
      // 同一手机号更新姓名（保留 attempts）
      const updated = { ...existing, name: String(name).trim() };
      await redis.set(userKey, updated);
      return NextResponse.json({
        name: updated.name,
        phone: updated.phone,
        attempts: updated.attempts ?? 0,
      });
    }
    const user = { name: String(name).trim(), phone, attempts: 0 };
    await redis.set(userKey, user);
    return NextResponse.json({ name: user.name, phone: user.phone, attempts: 0 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
