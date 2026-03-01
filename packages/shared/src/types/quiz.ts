import type { BaseEntity, TenantScoped } from './common';

export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  SingleChoice = 'single_choice',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
  FillBlank = 'fill_blank',
}

export enum ShowResultsAfter {
  Immediately = 'immediately',
  AfterDeadline = 'after_deadline',
  Manual = 'manual',
}

export interface Quiz extends BaseEntity, TenantScoped {
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string;
  time_limit_minutes: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  show_results_after: ShowResultsAfter;
  available_from: string;
  available_until: string;
  is_published: boolean;
  shared_to_library: boolean;
  tags: string[];
}

export interface Question extends BaseEntity {
  quiz_id: string;
  type: QuestionType;
  text: string;
  image_id: string | null;
  points: number;
  order: number;
  explanation: string;
}

export interface Answer {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

export interface QuizAttemptAnswer {
  question_id: string;
  answer_id: string[];
  text_answer?: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  max_score: number;
  answers: QuizAttemptAnswer[];
  created_at: string;
}
