export type QuestionType = "single" | "multiple";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  answer: string;
}

export interface SubmittedAnswer {
  questionId: string;
  type: QuestionType;
  selected: string[];
  correct: boolean;
  score: number;
  correctAnswer: string;
}

export interface ExamResult {
  name: string;
  phone: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  details: SubmittedAnswer[];
}

// 考试配置（倒计时、满分、通过线、次数限制）
export const EXAM_CONFIG = {
  TOTAL_MINUTES: 60,           // 限时 60 分钟
  POINTS_PER_QUESTION: 2,      // 每题 2 分
  PASS_SCORE: 70,              // 通过线
  MAX_ATTEMPTS: 3,             // 每手机号最多 3 次
};
