"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("请输入姓名");
    if (!/^1[3-9]\d{9}$/.test(phone)) return setErr("手机号格式不正确（11 位，1 开头第二位 3-9）");
    setLoading(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "注册失败");
      localStorage.setItem("exam_user", JSON.stringify(data));
      router.push("/exam");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-midnight via-deep to-teal">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block w-1 h-12 bg-accent align-middle mr-3" />
          <h1 className="inline-block align-middle text-3xl font-bold text-white tracking-wide">
            课程在线考试
          </h1>
          <p className="text-slate-300 mt-2">姓名 + 手机号 · 50 题 · 100 分 · 70 分通过</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-2xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的真实姓名"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-deep focus:border-transparent outline-none"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="11 位手机号"
              maxLength={11}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-deep focus:border-transparent outline-none"
              autoComplete="tel"
            />
          </div>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{err}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-midnight hover:bg-deep disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? "处理中…" : "开始考试"}
          </button>

          <p className="text-xs text-slate-400 text-center pt-2">
            每个手机号可以多次参加，系统记录每次成绩
          </p>
        </form>
      </div>
    </main>
  );
}
