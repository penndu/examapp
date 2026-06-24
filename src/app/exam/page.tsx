"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import questionsData from "@/data/questions.json";
import { EXAM_CONFIG, type ExamResult, type Question } from "@/lib/types";

const QUESTIONS = questionsData.questions as Question[];
const TIME_LIMIT_SECONDS = EXAM_CONFIG.TOTAL_MINUTES * 60;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type Phase = "loading" | "exam" | "submitting" | "result";

export default function ExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<{ name: string; phone: string; attempts?: number } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<ExamResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("exam_user");
    if (!raw) {
      setPhase("no_user");
      return;
    }
    try {
      const u = JSON.parse(raw) as {
        name: string;
        phone: string;
        attemptsLeft?: number;
      };
      setUser(u);
      if (u.attemptsLeft !== undefined && u.attemptsLeft <= 0) {
        setPhase("no_attempts");
        return;
      }
      setPhase("fs_prompt");
    } catch {
      setPhase("no_user");
    }
  }, []);

  const answeredCount = Object.keys(answers).filter(
    (k) => (answers[k] || []).length > 0
  ).length;

  // 倒计时：每秒减 1，到 0 自动交卷
  useEffect(() => {
    if (phase !== "exam") return;
    if (secondsLeft <= 0) {
      if (!autoSubmitted) {
        setAutoSubmitted(true);
        doSubmit(true);
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  async function doSubmit(silent = false) {
    if (!user) return;
    if (!silent && answeredCount < QUESTIONS.length) {
      if (!confirm(`还有 ${QUESTIONS.length - answeredCount} 题未作答，确定要交卷吗？`)) {
        return;
      }
    }
    setPhase("submitting");
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, phone: user.phone, answers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "提交失败");
      setResult(data);
      setPhase("result");
      // 记录已用次数（前端用于"再考一次"按钮显示）
      try {
        const used = Number(localStorage.getItem("exam_used") || "0") + 1;
        localStorage.setItem("exam_used", String(used));
      } catch {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "提交失败";
      alert(msg);
      setPhase("exam");
    }
  }

  const handleSelect = (qid: string, key: string, type: "single" | "multiple") => {
    setAnswers((prev) => {
      const cur = prev[qid] || [];
      if (type === "single") return { ...prev, [qid]: [key] };
      const exists = cur.includes(key);
      return { ...prev, [qid]: exists ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  };

  const wrongQuestions = useMemo(() => {
    if (!result) return [];
    return QUESTIONS.filter((q) => {
      const d = result.details.find((x) => x.questionId === q.id);
      return d && !d.correct;
    });
  }, [result]);

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        加载中…
      </div>
    );
  }

  if (phase === "result" && result) {
    const correctCount = result.details.filter((d) => d.correct).length;
    const usedAttempts = Number(
      typeof window !== "undefined" ? localStorage.getItem("exam_used") || "0" : "0"
    );
    const attemptsLeft = Math.max(0, EXAM_CONFIG.MAX_ATTEMPTS - usedAttempts);
    const totalScore = QUESTIONS.length * EXAM_CONFIG.POINTS_PER_QUESTION;
    return (
      <main className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* 分数大卡片 */}
          <div
            className={`rounded-2xl shadow-xl p-8 text-center text-white ${
              result.passed
                ? "bg-gradient-to-br from-teal to-deep"
                : "bg-gradient-to-br from-slate-700 to-slate-900"
            }`}
          >
            <p className="text-sm tracking-widest opacity-80">
              {result.name} · {result.phone}
            </p>
            <div className="my-4">
              <span className="text-7xl font-bold">{result.score}</span>
              <span className="text-2xl opacity-80"> / {totalScore}</span>
            </div>
            <p className="text-lg">
              答对 <strong>{correctCount}</strong> / {QUESTIONS.length} 题
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {result.passed
                ? "🎉 恭喜，通过！"
                : `❌ 未通过，差 ${EXAM_CONFIG.PASS_SCORE - result.score} 分`}
            </p>
            <p className="text-xs opacity-70 mt-2">
              {new Date(result.submittedAt).toLocaleString("zh-CN")}
            </p>
          </div>

          {/* 答错清单 — 不显示正确答案 */}
          {wrongQuestions.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl shadow p-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                答错清单 ({wrongQuestions.length} 题)
              </h2>
              <ol className="space-y-4">
                {wrongQuestions.map((q, i) => {
                  const d = result.details.find((x) => x.questionId === q.id)!;
                  return (
                    <li key={q.id} className="border-l-4 border-red-400 bg-red-50 p-4 rounded">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 font-bold">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                q.type === "single"
                                  ? "bg-deep text-white"
                                  : "bg-accent text-white"
                              }`}
                            >
                              {q.type === "single" ? "单选" : "多选"}
                            </span>
                            <p className="font-medium text-slate-800">{q.stem}</p>
                          </div>
                          <div className="text-sm space-y-1 mt-2">
                            <p>
                              <span className="text-slate-500">你的答案：</span>
                              <span className="text-red-600 font-mono">
                                {d.selected.length ? d.selected.join(", ") : "未作答"}
                              </span>
                            </p>
                            <p className="text-slate-500 italic text-xs">
                              正确答案不予公布
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {attemptsLeft > 0 ? (
              <button
                onClick={() => {
                  if (
                    !confirm(`再考一次将消耗 1 次机会（剩余 ${attemptsLeft} 次），确定吗？`)
                  )
                    return;
                  setAnswers({});
                  setResult(null);
                  setSecondsLeft(TIME_LIMIT_SECONDS);
                  setAutoSubmitted(false);
                  setPhase("exam");
                  window.scrollTo({ top: 0 });
                }}
                className="flex-1 py-3 bg-deep hover:bg-midnight text-white font-semibold rounded-lg transition"
              >
                再考一次（剩余 {attemptsLeft} 次）
              </button>
            ) : (
              <div className="flex-1 py-3 bg-slate-300 text-slate-500 text-center rounded-lg">
                已用完 {EXAM_CONFIG.MAX_ATTEMPTS} 次考试机会
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem("exam_user");
                localStorage.removeItem("exam_used");
                router.push("/");
              }}
              className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100"
            >
              退出
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      {/* 顶部状态栏：用户 + 已答 + 倒计时 */}
      <div className="sticky top-0 z-10 bg-midnight text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="font-bold">在线考试</span>
            <span className="text-slate-300 text-sm ml-3 truncate">
              {user?.name} · {user?.phone}
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm shrink-0">
            <div>
              已答 <span className="font-bold text-accent">{answeredCount}</span> /{" "}
              {QUESTIONS.length}
            </div>
            <div
              className={`font-mono text-base font-bold tabular-nums ${
                secondsLeft <= 60 ? "text-red-400 animate-pulse" : "text-accent"
              }`}
              title="剩余时间"
            >
              ⏱ {formatTime(secondsLeft)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {QUESTIONS.map((q, idx) => {
          const selected = answers[q.id] || [];
          return (
            <div key={q.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-deep text-white text-sm font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        q.type === "single" ? "bg-deep text-white" : "bg-accent text-white"
                      }`}
                    >
                      {q.type === "single" ? "单选" : "多选"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {EXAM_CONFIG.POINTS_PER_QUESTION} 分
                    </span>
                  </div>
                  <p className="text-slate-800 mb-3 leading-relaxed">{q.stem}</p>
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const isSel = selected.includes(opt.key);
                      return (
                        <label
                          key={opt.key}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                            isSel
                              ? "border-deep bg-ice"
                              : "border-slate-200 hover:border-deep hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type={q.type === "single" ? "radio" : "checkbox"}
                            name={q.id}
                            checked={isSel}
                            onChange={() => handleSelect(q.id, opt.key, q.type)}
                            className="mt-1 accent-deep"
                          />
                          <span className="font-bold text-deep w-4">{opt.key}.</span>
                          <span className="flex-1 text-slate-700">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            满分 {QUESTIONS.length * EXAM_CONFIG.POINTS_PER_QUESTION}，
            {EXAM_CONFIG.PASS_SCORE} 分通过 · 限时 {EXAM_CONFIG.TOTAL_MINUTES} 分钟
          </div>
          <button
            onClick={() => doSubmit(false)}
            disabled={phase === "submitting"}
            className="px-8 py-3 bg-midnight hover:bg-deep disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {phase === "submitting" ? "提交中…" : "交卷"}
          </button>
        </div>
      </div>
    </main>
  );
}
