import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPwd = process.env.ADMIN_PASSWORD;
    if (!adminPwd) {
      return NextResponse.json({ error: "ADMIN_PASSWORD 未配置" }, { status: 500 });
    }
    if (password !== adminPwd) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", adminPwd, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 小时
    });
    return res;
  } catch {
    return NextResponse.json({ error: "请求失败" }, { status: 400 });
  }
}
