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
