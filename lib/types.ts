export type InboxStatus = "unprocessed" | "processing" | "processed" | "failed";

export type NoteCategory = "office" | "personal" | "miscellaneous";

export type FinanceType = "expense" | "income";

export interface Attachment {
  id: string;
  filename: string;
  path: string;
  url?: string;
}

export interface InboxEntry {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source: "web";
  status: InboxStatus;
  attachments: Attachment[];
  processingNotes?: string;
  category?: NoteCategory;
}

export interface CreateInboxInput {
  title?: string;
  content: string;
  attachments?: { name: string; base64: string }[];
  category?: NoteCategory;
}

export interface UpdateInboxInput {
  title?: string;
  content?: string;
  category?: NoteCategory | null;
}

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  details?: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  title: string;
  details?: string;
}

export interface UpdateTaskInput {
  title?: string;
  details?: string;
  status?: TaskStatus;
}

export interface FinanceLog {
  id: string;
  amount: string;
  note: string;
  type: FinanceType;
  createdAt: string;
}

export interface CreateFinanceInput {
  amount: string;
  note: string;
  type: FinanceType;
}

export interface UpdateFinanceInput {
  amount?: string;
  note?: string;
  type?: FinanceType;
}
