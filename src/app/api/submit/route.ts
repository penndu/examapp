import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import questionsData from "@/data/questions.json";
import type { ExamResult, SubmittedAnswer } from "@/lib/types";

export const runtime = "nodejs";

const QUESTIONS = questionsData.questions as Array<{
  id: string;
  type: "single" | "multiple";
  answer: string;
}>;
const PASS_SCORE = 70;
const POINTS_PER_QUESTION = 2;

function setEqual(a: string, b: string) {
  return a.split("").sort().join("") === b.split("").sort().join("");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, answers } = body as {
      name?: string;
      phone?: string;
      answers?: Record<string, string[]>;
    };
    if (!name || !phone) {
      return NextResponse.json({ error: "缺少用户信息" }, { status: 400 });
    }
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "答案数据缺失" }, { status: 400 });
    }

    let score = 0;
    const details: SubmittedAnswer[] = [];
    for (const q of QUESTIONS) {
      const selected = (answers[q.id] || []).map((s) => s.toUpperCase()).sort();
      const correct = setEqual(selected.join(""), q.answer);
      const got = correct ? POINTS_PER_QUESTION : 0;
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
      passed: score >= PASS_SCORE,
      submittedAt: new Date().toISOString(),
      details,
    };

    const redis = getRedis();
    const listKey = "results";
    const existing = (await redis.get<string[]>(listKey)) || [];
    const id = `${Date.now()}-${phone}`;
    await redis.set(`result:${id}`, result);
    await redis.set(listKey, [...existing, id]);

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "服务器错误";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
