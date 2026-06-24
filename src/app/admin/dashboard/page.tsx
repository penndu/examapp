"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamResult } from "@/lib/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/results")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/admin");
          return;
        }
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "加载失败");
        setResults(data.results);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const filtered = results.filter((r) => {
    const q = query.trim();
    if (!q) return true;
    return r.name.includes(q) || r.phone.includes(q);
  });

  const passedCount = results.filter((r) => r.passed).length;
  const avgScore =
    results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-midnight text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">成绩后台</h1>
            <p className="text-xs text-slate-300 mt-1">考试数据查看与导出</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/api/admin/export"
              className="px-4 py-2 bg-accent hover:opacity-90 text-midnight font-semibold rounded text-sm"
            >
              导出 CSV
            </a>
            <button
              onClick={logout}
              className="px-4 py-2 border border-slate-400 text-slate-200 hover:bg-white/10 rounded text-sm"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-slate-500">参考人数</p>
            <p className="text-3xl font-bold text-midnight mt-1">{results.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-slate-500">通过人数</p>
            <p className="text-3xl font-bold text-teal mt-1">
              {passedCount}
              <span className="text-base text-slate-400 ml-2">
                ({results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0}%)
              </span>
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-sm text-slate-500">平均分</p>
            <p className="text-3xl font-bold text-deep mt-1">{avgScore}</p>
          </div>
        </div>

        {/* 搜索 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="搜索姓名或手机号…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-deep outline-none"
          />
        </div>

        {/* 表格 */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">加载中…</div>
          ) : err ? (
            <div className="p-8 text-center text-red-500">{err}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">暂无成绩数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">姓名</th>
                    <th className="px-4 py-3 text-left">手机号</th>
                    <th className="px-4 py-3 text-right">分数</th>
                    <th className="px-4 py-3 text-center">结果</th>
                    <th className="px-4 py-3 text-right">答对题数</th>
                    <th className="px-4 py-3 text-left">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const correct = r.details.filter((d) => d.correct).length;
                    return (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{r.phone}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold ${
                              r.passed ? "text-teal" : "text-red-500"
                            }`}
                          >
                            {r.score}
                          </span>
                          <span className="text-slate-400"> / 100</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              r.passed
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {r.passed ? "通过" : "未通过"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {correct} / {r.details.length}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(r.submittedAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          共 {filtered.length} 条记录 · 系统自动记录每次考试
        </p>
      </div>
    </main>
  );
}
