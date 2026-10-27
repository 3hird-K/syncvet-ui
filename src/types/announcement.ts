export type AnnouncementCategory =
  | "General"
  | "Vaccination Drive"
  | "Urgent Advisory"
  | "Clinic Schedule"
  | "Public Health";

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export interface CVOAnnouncement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  author_id?: string | null;
  author_name: string;
  author_role: string;
  target_barangay?: string | null;
  is_pinned: boolean;
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
  updated_at?: string;
}
