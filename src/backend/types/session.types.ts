export type SessionOutcome =
  | "IN_PROGRESS"
  | "RESOLVED"
  | "SCHEDULED"
  | "OUT_OF_SCOPE"
  | "NO_SLOT"
  | "DECLINED"
  | "MANAGED_APPOINTMENT"
  | "ABANDONED";

export type SessionPeriod =
  "7" | "30" | "90" | "current_month" | "previous_month" | "custom";

export interface SessionListFilters {
  search?: string;
  period: SessionPeriod;
  categoryId?: number;
  outcome: "all" | SessionOutcome;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface SessionListItem {
  id: string;
  code: string;
  started_at: string;
  outcome: SessionOutcome;
  current_step: string | null;
  category_name: string | null;
  question_title: string | null;
  appointment: {
    id: string;
    protocol: string;
    action: "CREATED" | "RESCHEDULED" | "CANCELED" | null;
  } | null;
}

export interface SessionChipCounts {
  all: number;
  resolved: number;
  scheduled: number;
  out_of_scope: number;
  no_slot: number;
  declined: number;
  managed_appointment: number;
  abandoned: number;
  in_progress: number;
}

export interface SessionListResponse {
  items: SessionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  chipCounts: SessionChipCounts;
  range: { from: string; to: string };
  categories: { id: number; name: string }[];
}

export interface SessionTimelineItem {
  id: string;
  type: string;
  created_at: string;
  category_name: string | null;
  question_title: string | null;
  data: Record<string, unknown>;
  appointment: { id: string; protocol: string } | null;
}

export interface SessionDetail {
  id: string;
  code: string;
  started_at: string;
  ended_at: string | null;
  outcome: SessionOutcome;
  current_step: string | null;
  category_name: string | null;
  question_title: string | null;
  appointment: {
    id: string;
    protocol: string;
    action: "CREATED" | "RESCHEDULED" | "CANCELED" | null;
  } | null;
  timeline: SessionTimelineItem[];
  other_sessions: {
    id: string;
    code: string;
    started_at: string;
    outcome: SessionOutcome;
  }[];
  anonymized: boolean;
}
