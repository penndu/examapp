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

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  if (!checkAuth()) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const redis = getRedis();
    const ids = (await redis.get<string[]>("results")) || [];
    const results: ExamResult[] = [];
    for (const id of ids) {
      const r = await redis.get<ExamResult>(`result:${id}`);
      if (r) results.push(r);
    }
    results.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

    // 按手机号 + 提交时间排序，标"第 N 次"
    const sorted = [...results].sort((a, b) =>
      a.submittedAt < b.submittedAt ? -1 : 1
    );
    const attemptMap = new Map<string, number>();

    const headers = [
      "姓名",
      "手机号",
      "分数",
      "是否通过",
      "第几次",
      "答对题数",
      "总题数",
      "提交时间",
    ];
    const correct = (r: ExamResult) => r.details.filter((d) => d.correct).length;
    const rows = sorted.map((r) => {
      const cnt = (attemptMap.get(r.phone) ?? 0) + 1;
      attemptMap.set(r.phone, cnt);
      return [
        r.name,
        r.phone,
        r.score,
        r.passed ? "通过" : "未通过",
        cnt,
        correct(r),
        r.details.length,
        new Date(r.submittedAt).toLocaleString("zh-CN"),
      ]
        .map(csvEscape)
        .join(",");
    });

    // 加 BOM 让 Excel 正确识别 UTF-8
    const csv = "\ufeff" + [headers.join(","), ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-results-${Date.now()}.csv"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return new Response(msg, { status: 500 });
  }
}
