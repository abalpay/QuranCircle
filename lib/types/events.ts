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
  juzs: JuzSnapshot[];
};

export type EventSnapshot = {
  id: string;
  name: string;
  description: string | null;
  short_code: string;
  is_public: boolean;
  is_archived: boolean;
  created_at: string;
  is_creator: boolean;
  is_member: boolean;
  can_manage: boolean;
  khatms: KhatmSnapshot[];
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
};
