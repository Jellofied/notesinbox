export type InboxStatus = "unprocessed" | "processing" | "processed" | "failed";

export interface Attachment {
  id: string;
  filename: string;
  path: string;
  url?: string;
}

export interface InboxEntry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source: "web";
  status: InboxStatus;
  attachments: Attachment[];
  processingNotes?: string;
}

export interface CreateInboxInput {
  content: string;
  attachments?: { name: string; base64: string }[];
}
