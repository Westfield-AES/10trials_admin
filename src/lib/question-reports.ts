export interface ReportGroup {
  question_id: number;
  report_count: number;
  open_count: number;
  last_reported_at: string;
  question_preview: string;
  question_type: string;
  topic: string;
  exams: string[];
  disabled: boolean;
}
export interface ReportSummary {
  open_reports: number;
  reported_questions: number;
  resolved: number;
  dismissed: number;
}
export interface ReportDetail {
  question_id: number;
  question: {
    type: string;
    topic: string;
    question: string;
    options?: Record<string, string> | null;
    correct_answer?: string | null;
    explanation?: string | null;
    model_answer?: string | null;
    marking_criteria?: string[] | null;
  };
  disabled: boolean;
  disabled_reason?: string | null;
  report_count: number;
  open_count: number;
  reports: Array<{
    id: string;
    reason: string;
    comment: string;
    status: string;
    created_at: string;
    resolved_at?: string | null;
    resolution_note?: string | null;
    exam_name: string;
    presented_question?: ReportDetail["question"] | null;
  }>;
}
export const reportReasons: Record<string, string> = {
  incorrect_answer: "Incorrect answer or explanation",
  unclear: "Unclear or ambiguous question",
  outdated: "Outdated information",
  other: "Another issue",
};
