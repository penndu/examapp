"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "登录失败");
      router.push("/admin/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "登录失败";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-midnight via-deep to-teal">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-midnight">后台管理</h1>
          <p className="text-sm text-slate-500 mt-1">成绩查看 / 导出</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">管理员密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-deep outline-none"
            autoFocus
          />
        </div>
        {err && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{err}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-midnight hover:bg-deep disabled:opacity-50 text-white font-semibold rounded-lg"
        >
          {loading ? "验证中…" : "登录"}
        </button>
      </form>
    </main>
  );
}
