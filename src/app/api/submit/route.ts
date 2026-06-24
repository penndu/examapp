import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import questionsData from "@/data/questions.json";
import { EXAM_CONFIG, type ExamResult, type SubmittedAnswer } from "@/lib/types";

export const runtime = "nodejs";

const QUESTIONS = questionsData.questions as Array<{
  id: string;
  type: "single" | "multiple";
  answer: string;
}>;

function setEqual(a: string, b: string) {
  return a.split("").sort().join("") === b.split("").sort().join("");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, answers, durationSec } = body as {
      name?: string;
      phone?: string;
      answers?: Record<string, string[]>;
      durationSec?: number;
    };
    if (!name || !phone) {
      return NextResponse.json({ error: "缺少用户信息" }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "答案数据缺失" }, { status: 400 });
    }

    // 检查考试次数
    const redis = getRedis();
    const userKey = `user:${phone}`;
    const user = await redis.get<{ name: string; attempts: number }>(userKey);
    const attempts = user?.attempts ?? 0;
    if (attempts >= EXAM_CONFIG.MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: `每个手机号最多只能参加 ${EXAM_CONFIG.MAX_ATTEMPTS} 次考试，您已用完。` },
        { status: 429 }
      );
    }

    let score = 0;
    const details: SubmittedAnswer[] = [];
    for (const q of QUESTIONS) {
      const selected = (answers[q.id] || []).map((s) => s.toUpperCase()).sort();
      const correct = setEqual(selected.join(""), q.answer);
      const got = correct ? EXAM_CONFIG.POINTS_PER_QUESTION : 0;
      score += got;
      details.push({
        questionId: q.id,
        type: q.type,
        selected,
        correct,
        score: got,
        correctAnswer: q.answer,
      });
    }

    const result: ExamResult = {
      name,
      phone,
      score,
      passed: score >= EXAM_CONFIG.PASS_SCORE,
      submittedAt: new Date().toISOString(),
      details,
      durationSec: typeof durationSec === "number" && durationSec >= 0 ? Math.round(durationSec) : undefined,
    };

    const listKey = "results";
    const existing = (await redis.get<string[]>(listKey)) || [];
    const id = `${Date.now()}-${phone}`;
    await redis.set(`result:${id}`, result);
    await redis.set(listKey, [...existing, id]);

    // 更新已用次数
    await redis.set(userKey, {
      name: user?.name ?? name,
      phone,
      attempts: attempts + 1,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
