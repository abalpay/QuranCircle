export type JuzSnapshot = {
  id: string;
  juz_number: number;
  status: "unclaimed" | "claimed" | "read";
  claimed_by_name: string | null;
  is_mine: boolean;
};

export type KhatmSnapshot = {
  id: string;
  khatm_number: number;
  claimed_count: number;
  read_count: number;
  completed_at: string | null;
  completion_source: "all_done" | "organizer" | "auto" | null;
  /** Latest claim time; with +7 days it is the auto-completion date. Absent until the snapshot RPC returns it. */
  last_claimed_at?: string | null;
  juzs: JuzSnapshot[];
};

export type EventSnapshot = {
  id: string;
  name: string;
  description: string | null;
  short_code: string;
  is_public: boolean;
  is_archived: boolean;
  open_next_khatm: boolean;
  created_at: string;
  is_creator: boolean;
  is_member: boolean;
  can_manage: boolean;
  khatms: KhatmSnapshot[];
  loaded_khatms: number;
  total_khatms: number;
  has_more_khatms: boolean;
  next_before_khatm_number: number | null;
};

export type PublicEventWithProgress = {
  id: string;
  name: string;
  description: string | null;
  short_code: string;
  deadline: string | null;
  is_public: boolean;
  created_at: string;
  claimed: number;
  total: number;
};

export type MyCircleWithProgress = {
  id: string;
  name: string;
  description: string | null;
  short_code: string;
  is_public: boolean;
  created_at: string;
  is_archived: boolean;
  archived_at: string | null;
  relation: "creator" | "participant";
  claimed: number;
  total: number;
  my_claimed: number;
  my_read: number;
  last_activity_at: string;
  /** A fully claimed, still open khatm in a circle that is not archived (D5.2). */
  has_khatm_ready_to_complete: boolean;
};
