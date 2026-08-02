export type AdminRole = "owner" | "operations" | "support" | "viewer";

export type AdminPermission =
  | "dashboard.read"
  | "users.read"
  | "users.usage.adjust"
  | "users.account.delete"
  | "users.account.restore"
  | "learning.read"
  | "billing.read"
  | "ai.read"
  | "jobs.read"
  | "jobs.retry"
  | "audit.read"
  | "admins.manage";

export interface AdminProfile {
  id: string;
  email: string;
  display_name?: string | null;
  role: AdminRole;
  permissions: AdminPermission[];
}

export interface AdminAuthChallenge {
  challenge_token: string;
  expires_at: string;
  resend_available_at: string;
  delivery: {
    channel: "email";
    destination: string;
  };
}

export interface AdminSessionResponse {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  admin: AdminProfile;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface Overview {
  summary: {
    total_users: number;
    active_accounts: number;
    new_users: number;
    active_users: number;
    pro_users: number;
    generated_sessions: number;
    completed_sessions: number;
    average_score: number;
    failed_jobs: number;
    ai_cost_usd: number;
    pending_deletions: number;
    completion_rate: number;
  };
  revenue: Array<{ currency: string; amount: number }>;
  series: Array<{
    day: string;
    users: number;
    sessions: number;
    completions: number;
    ai_cost_usd: number;
  }>;
}

export interface UserListItem {
  id: string;
  email?: string | null;
  display_name?: string | null;
  plan: string;
  status: string;
  preferred_language: string;
  email_verified: boolean;
  last_login_at?: string | null;
  age_confirmed: boolean;
  created_at: string;
  sessions_used: number;
  completed_sessions: number;
  subscription_status?: string | null;
}

export interface SessionItem {
  id: string;
  user_id: string;
  user_email?: string | null;
  exam_name: string;
  format?: string | null;
  mode?: string | null;
  num_questions?: number | null;
  score?: number | null;
  percentage?: number | null;
  is_retry: boolean;
  channel: string;
  status: string;
  difficulty?: string | null;
  curriculum_year?: string | null;
  target_score?: number | null;
  language: string;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDetail {
  user: UserListItem & {
    timezone?: string | null;
    marketing_consent: boolean;
    guardian_consent: boolean;
    deleted_at?: string | null;
    deletion_scheduled_for?: string | null;
    updated_at: string;
  };
  usage: { sessions: number; questions: number };
  subscription?: SubscriptionItem | null;
  session_summary: {
    total: number;
    completed: number;
    abandoned: number;
    average_score: number;
    last_session_at?: string | null;
  };
  recent_sessions: SessionItem[];
  session_count: number;
}

export interface LearningInsights {
  summary: {
    generated: number;
    completed: number;
    abandoned: number;
    retries: number;
    average_score: number;
    average_duration_seconds: number;
    completion_rate: number;
  };
  top_exams: Array<{
    exam_name: string;
    sessions: number;
    completed: number;
    average_score: number;
  }>;
  dimensions: Record<string, Array<{ label: string; value: number }>>;
}

export interface BillingSummary {
  subscription_statuses: Array<{ status: string; value: number }>;
  revenue: Array<{ currency: string; transactions: number; amount: number }>;
  mrr: Array<{ currency: string; amount: number }>;
  payment_failures: number;
}

export interface SubscriptionItem {
  id: string;
  user_id: string;
  user_email?: string | null;
  display_name?: string | null;
  provider: string;
  plan: string;
  billing_period?: string | null;
  currency?: string | null;
  amount?: number | null;
  status: string;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  grace_ends_at?: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  provider: string;
  event_type: string;
  processed_at?: string | null;
  created_at: string;
  currency?: string | null;
  amount?: number | null;
  reference?: string | null;
}

export interface AiSummary {
  summary: {
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cache_write_tokens: number;
    cache_read_tokens: number;
    web_searches: number;
    cost_usd: number;
  };
  by_model: Array<{ model: string; calls: number; cost_usd: number }>;
  by_stage: Array<{ stage: string; calls: number; cost_usd: number }>;
  by_day: Array<{ day: string; calls: number; cost_usd: number }>;
  top_users: Array<{
    user_id: string;
    user_email?: string | null;
    calls: number;
    cost_usd: number;
  }>;
}

export interface JobsSummary {
  summary: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    average_runtime_seconds: number;
  };
  by_type: Array<{
    job_type: string;
    total: number;
    failed: number;
    average_runtime_seconds: number;
  }>;
  errors: Array<{ error_code: string; value: number }>;
}

export interface JobItem {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  job_type: string;
  status: string;
  progress: number;
  error_code?: string | null;
  error_message?: string | null;
  attempts: number;
  run_after: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_firebase_uid: string;
  admin_email?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  request_id?: string | null;
  metadata: Record<string, unknown> | string;
  created_at: string;
}

export interface AdminMember {
  id: string;
  firebase_uid: string;
  email: string;
  display_name?: string | null;
  role: AdminRole;
  status: "active" | "inactive";
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}
