import { createEntryId, createFinanceId, createTaskId } from "@/lib/id";
import { formatIndiaISO } from "@/lib/time";
import type {
  Attachment,
  CreateFinanceInput,
  CreateInboxInput,
  CreateTaskInput,
  FinanceLog,
  FinanceType,
  InboxEntry,
  InboxStatus,
  NoteCategory,
  Task,
  TaskStatus,
  UpdateFinanceInput,
  UpdateInboxInput,
  UpdateTaskInput,
} from "@/lib/types";

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) {
    throw new Error("GitHub storage is not configured");
  }
  return {
    token,
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    inboxPath: process.env.GITHUB_INBOX_PATH || "inbox",
    attachmentsPath: process.env.GITHUB_ATTACHMENTS_PATH || "attachments",
    tasksPath: process.env.GITHUB_TASKS_PATH || "tasks",
    financePath: process.env.GITHUB_FINANCE_PATH || "finance",
  };
}

function headers() {
  const { token } = getConfig();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function stripBase64Prefix(base64: string): string {
  const idx = base64.indexOf(",");
  return idx >= 0 ? base64.slice(idx + 1) : base64;
}

async function githubFetch(path: string, init?: RequestInit) {
  const { owner, repo } = getConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res;
}

function encodeBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

function decodeBase64(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf-8");
}

function serializeFrontmatter(meta: Record<string, string>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    const escaped = value.includes('"') ? JSON.stringify(value) : `"${value}"`;
    lines.push(`${key}: ${escaped}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(text: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: text.trim() };
  }
  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body: match[2].trim() };
}

function parseAttachmentsFromBody(body: string): Attachment[] {
  const attachments: Attachment[] = [];
  const regex = /!\[([^\]]*)\]\(\.\.\/attachments\/([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const filename = match[2];
    attachments.push({
      id: filename,
      filename,
      path: `attachments/${filename}`,
    });
  }
  return attachments;
}

function buildMarkdown(entry: InboxEntry): string {
  const fm: Record<string, string> = {
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    source: entry.source,
    status: entry.status,
  };
  if (entry.title) fm.title = entry.title;
  if (entry.category) fm.category = entry.category;
  if (entry.processingNotes) {
    fm.processingNotes = entry.processingNotes;
  }
  let body = entry.content;
  for (const att of entry.attachments) {
    body += `\n\n![Attached image](../attachments/${att.filename})`;
  }
  return `${serializeFrontmatter(fm)}\n\n${body}`;
}

function fileToEntry(name: string, text: string): InboxEntry | null {
  const { frontmatter, body } = parseFrontmatter(text);
  const id = frontmatter.id || name.replace(/\.md$/, "");
  const createdAt = frontmatter.createdAt || new Date().toISOString();
  const status = (frontmatter.status as InboxStatus) || "unprocessed";
  const attachments = parseAttachmentsFromBody(body);
  const content = body
    .replace(/!\[[^\]]*\]\(\.\.\/attachments\/[^)]+\)\n?/g, "")
    .trim();
  return {
    id,
    title: frontmatter.title,
    content,
    createdAt,
    updatedAt: frontmatter.updatedAt || createdAt,
    source: (frontmatter.source as "web") || "web",
    status,
    attachments,
    processingNotes: frontmatter.processingNotes,
    category: frontmatter.category as NoteCategory | undefined,
  };
}

export async function createInboxEntry(
  input: CreateInboxInput
): Promise<InboxEntry> {
  const cfg = getConfig();
  const now = new Date();
  const id = createEntryId(now);
  const createdAt = formatIndiaISO(now);

  const attachments: Attachment[] = [];
  if (input.attachments && input.attachments.length > 0) {
    for (let i = 0; i < input.attachments.length; i++) {
      const att = input.attachments[i];
      const filename = `${id}-image-${i + 1}.jpg`;
      const path = `${cfg.attachmentsPath}/${filename}`;
      const content = stripBase64Prefix(att.base64);
      await githubFetch(`/contents/${encodeURIComponent(path)}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `Add attachment ${filename}`,
          content,
          branch: cfg.branch,
        }),
      });
      attachments.push({ id: filename, filename, path });
    }
  }

  const entry: InboxEntry = {
    id,
    title: input.title?.trim() || undefined,
    content: input.content.trim(),
    createdAt,
    updatedAt: createdAt,
    source: "web",
    status: "unprocessed",
    attachments,
    category: input.category || "miscellaneous",
  };

  const md = buildMarkdown(entry);
  const path = `${cfg.inboxPath}/${id}.md`;
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Capture inbox entry ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
    }),
  });

  return entry;
}

export async function getInboxEntries(options?: {
  search?: string;
  limit?: number;
}): Promise<InboxEntry[]> {
  const cfg = getConfig();
  const search = (options?.search || "").trim().toLowerCase();
  const limit = options?.limit ?? 50;

  let items: Array<{ name: string; path: string; type: string }> = [];
  try {
    const res = await githubFetch(
      `/contents/${encodeURIComponent(cfg.inboxPath)}?ref=${cfg.branch}`
    );
    const data = await res.json();
    if (Array.isArray(data)) {
      items = data.filter((i) => i.type === "file" && i.name.endsWith(".md"));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return [];
    }
    throw err;
  }

  const entries: InboxEntry[] = [];
  for (const item of items) {
    try {
      const res = await githubFetch(
        `/contents/${encodeURIComponent(item.path)}?ref=${cfg.branch}`
      );
      const data = await res.json();
      const text = decodeBase64(data.content);
      const entry = fileToEntry(item.name, text);
      if (entry) entries.push(entry);
    } catch {
      // Skip unreadable files
    }
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let result = entries;
  if (search) {
    result = entries.filter(
      (e) =>
        e.content.toLowerCase().includes(search) ||
        e.id.toLowerCase().includes(search)
    );
  }
  return result.slice(0, limit);
}

export async function updateInboxEntry(
  id: string,
  updates: Partial<Pick<InboxEntry, "status" | "processingNotes">>
): Promise<InboxEntry> {
  const cfg = getConfig();
  const path = `${cfg.inboxPath}/${id}.md`;
  const res = await githubFetch(`/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`);
  const data = await res.json();
  const text = decodeBase64(data.content);
  const entry = fileToEntry(`${id}.md`, text);
  if (!entry) throw new Error("Entry not found");

  if (updates.status) entry.status = updates.status;
  if (updates.processingNotes !== undefined) {
    entry.processingNotes = updates.processingNotes;
  }
  entry.updatedAt = formatIndiaISO(new Date());

  const md = buildMarkdown(entry);
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update inbox entry ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return entry;
}

export async function editInboxEntry(
  id: string,
  updates: UpdateInboxInput
): Promise<InboxEntry> {
  const cfg = getConfig();
  const path = `${cfg.inboxPath}/${id}.md`;
  const res = await githubFetch(`/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`);
  const data = await res.json();
  const text = decodeBase64(data.content);
  const entry = fileToEntry(`${id}.md`, text);
  if (!entry) throw new Error("Entry not found");
  if (entry.status !== "unprocessed") {
    throw new Error("Only unprocessed captures can be edited");
  }

  if (updates.title !== undefined) {
    entry.title = updates.title.trim() || undefined;
  }
  if (updates.content !== undefined) {
    entry.content = updates.content.trim();
  }
  if (updates.category !== undefined) {
    entry.category = updates.category || undefined;
  }
  entry.updatedAt = formatIndiaISO(new Date());

  const md = buildMarkdown(entry);
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Edit inbox entry ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return entry;
}

export async function deleteInboxEntry(id: string): Promise<InboxEntry> {
  const cfg = getConfig();
  const path = `${cfg.inboxPath}/${id}.md`;

  const res = await githubFetch(
    `/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`
  );
  const data = await res.json();
  const text = decodeBase64(data.content);
  const entry = fileToEntry(`${id}.md`, text);
  if (!entry) throw new Error("Entry not found");

  if (entry.status !== "unprocessed") {
    throw new Error("Only unprocessed captures can be deleted");
  }

  for (const att of entry.attachments) {
    try {
      const attRes = await githubFetch(
        `/contents/${encodeURIComponent(att.path)}?ref=${cfg.branch}`
      );
      const attData = await attRes.json();
      await githubFetch(`/contents/${encodeURIComponent(att.path)}`, {
        method: "DELETE",
        body: JSON.stringify({
          message: `Delete attachment ${att.filename}`,
          branch: cfg.branch,
          sha: attData.sha,
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("404")) throw err;
    }
  }

  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `Delete inbox entry ${id}`,
      branch: cfg.branch,
      sha: data.sha,
    }),
  });

  return entry;
}

function buildTaskMarkdown(task: Task): string {
  const fm: Record<string, string> = {
    id: task.id,
    createdAt: task.createdAt,
    status: task.status,
  };
  if (task.completedAt) fm.completedAt = task.completedAt;
  let body = task.title;
  if (task.details) body += `\n\n${task.details}`;
  return `${serializeFrontmatter(fm)}\n\n${body}`;
}

function fileToTask(name: string, text: string): Task | null {
  const { frontmatter, body } = parseFrontmatter(text);
  const id = frontmatter.id || name.replace(/\.md$/, "");
  const createdAt = frontmatter.createdAt || new Date().toISOString();
  const status = (frontmatter.status as TaskStatus) || "pending";
  const [title = "", ...detailsParts] = body.trim().split("\n\n");
  return {
    id,
    title: title.trim(),
    details: detailsParts.join("\n\n").trim() || undefined,
    status,
    createdAt,
    completedAt: frontmatter.completedAt,
  };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const cfg = getConfig();
  const now = new Date();
  const id = createTaskId(now);
  const createdAt = formatIndiaISO(now);
  const task: Task = {
    id,
    title: input.title.trim(),
    details: input.details?.trim() || undefined,
    status: "pending",
    createdAt,
  };
  const md = buildTaskMarkdown(task);
  const path = `${cfg.tasksPath}/${id}.md`;
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add task ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
    }),
  });
  return task;
}

export async function getTasks(options?: {
  limit?: number;
}): Promise<Task[]> {
  const cfg = getConfig();
  const limit = options?.limit ?? 50;

  let items: Array<{ name: string; path: string; type: string }> = [];
  try {
    const res = await githubFetch(
      `/contents/${encodeURIComponent(cfg.tasksPath)}?ref=${cfg.branch}`
    );
    const data = await res.json();
    if (Array.isArray(data)) {
      items = data.filter((i) => i.type === "file" && i.name.endsWith(".md"));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return [];
    }
    throw err;
  }

  const tasks: Task[] = [];
  for (const item of items) {
    try {
      const res = await githubFetch(
        `/contents/${encodeURIComponent(item.path)}?ref=${cfg.branch}`
      );
      const data = await res.json();
      const text = decodeBase64(data.content);
      const task = fileToTask(item.name, text);
      if (task) tasks.push(task);
    } catch {
      // Skip unreadable files
    }
  }

  tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return tasks.slice(0, limit);
}

export async function updateTask(
  id: string,
  updates: UpdateTaskInput
): Promise<Task> {
  const cfg = getConfig();
  const path = `${cfg.tasksPath}/${id}.md`;
  const res = await githubFetch(
    `/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`
  );
  const data = await res.json();
  const text = decodeBase64(data.content);
  const task = fileToTask(`${id}.md`, text);
  if (!task) throw new Error("Task not found");

  if (updates.title !== undefined) task.title = updates.title.trim();
  if (updates.details !== undefined) {
    task.details = updates.details.trim() || undefined;
  }
  if (updates.status !== undefined) {
    task.status = updates.status;
    if (updates.status === "completed") {
      task.completedAt = formatIndiaISO(new Date());
    } else {
      task.completedAt = undefined;
    }
  }

  const md = buildTaskMarkdown(task);
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update task ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return task;
}

export async function deleteTask(id: string): Promise<Task> {
  const cfg = getConfig();
  const path = `${cfg.tasksPath}/${id}.md`;
  const res = await githubFetch(
    `/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`
  );
  const data = await res.json();
  const text = decodeBase64(data.content);
  const task = fileToTask(`${id}.md`, text);
  if (!task) throw new Error("Task not found");

  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `Delete task ${id}`,
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return task;
}

function buildFinanceMarkdown(log: FinanceLog): string {
  const fm: Record<string, string> = {
    id: log.id,
    createdAt: log.createdAt,
    type: log.type,
    amount: log.amount,
  };
  return `${serializeFrontmatter(fm)}\n\n${log.note}`;
}

function fileToFinance(name: string, text: string): FinanceLog | null {
  const { frontmatter, body } = parseFrontmatter(text);
  const id = frontmatter.id || name.replace(/\.md$/, "");
  const createdAt = frontmatter.createdAt || new Date().toISOString();
  const type = (frontmatter.type as FinanceType) || "expense";
  return {
    id,
    amount: frontmatter.amount || "",
    note: body.trim(),
    type,
    createdAt,
  };
}

export async function createFinanceLog(
  input: CreateFinanceInput
): Promise<FinanceLog> {
  const cfg = getConfig();
  const now = new Date();
  const id = createFinanceId(now);
  const createdAt = formatIndiaISO(now);
  const log: FinanceLog = {
    id,
    amount: input.amount.trim(),
    note: input.note.trim(),
    type: input.type,
    createdAt,
  };
  const md = buildFinanceMarkdown(log);
  const path = `${cfg.financePath}/${id}.md`;
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add finance log ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
    }),
  });
  return log;
}

export async function getFinanceLogs(options?: {
  limit?: number;
}): Promise<FinanceLog[]> {
  const cfg = getConfig();
  const limit = options?.limit ?? 50;

  let items: Array<{ name: string; path: string; type: string }> = [];
  try {
    const res = await githubFetch(
      `/contents/${encodeURIComponent(cfg.financePath)}?ref=${cfg.branch}`
    );
    const data = await res.json();
    if (Array.isArray(data)) {
      items = data.filter((i) => i.type === "file" && i.name.endsWith(".md"));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return [];
    }
    throw err;
  }

  const logs: FinanceLog[] = [];
  for (const item of items) {
    try {
      const res = await githubFetch(
        `/contents/${encodeURIComponent(item.path)}?ref=${cfg.branch}`
      );
      const data = await res.json();
      const text = decodeBase64(data.content);
      const log = fileToFinance(item.name, text);
      if (log) logs.push(log);
    } catch {
      // Skip unreadable files
    }
  }

  logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return logs.slice(0, limit);
}

export async function updateFinanceLog(
  id: string,
  updates: UpdateFinanceInput
): Promise<FinanceLog> {
  const cfg = getConfig();
  const path = `${cfg.financePath}/${id}.md`;
  const res = await githubFetch(
    `/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`
  );
  const data = await res.json();
  const text = decodeBase64(data.content);
  const log = fileToFinance(`${id}.md`, text);
  if (!log) throw new Error("Finance log not found");

  if (updates.amount !== undefined) log.amount = updates.amount.trim();
  if (updates.note !== undefined) log.note = updates.note.trim();
  if (updates.type !== undefined) log.type = updates.type;

  const md = buildFinanceMarkdown(log);
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Update finance log ${id}`,
      content: encodeBase64(md),
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return log;
}

export async function deleteFinanceLog(id: string): Promise<FinanceLog> {
  const cfg = getConfig();
  const path = `${cfg.financePath}/${id}.md`;
  const res = await githubFetch(
    `/contents/${encodeURIComponent(path)}?ref=${cfg.branch}`
  );
  const data = await res.json();
  const text = decodeBase64(data.content);
  const log = fileToFinance(`${id}.md`, text);
  if (!log) throw new Error("Finance log not found");

  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    body: JSON.stringify({
      message: `Delete finance log ${id}`,
      branch: cfg.branch,
      sha: data.sha,
    }),
  });
  return log;
}

export async function uploadAttachment(
  entryId: string,
  index: number,
  base64: string
): Promise<Attachment> {
  const cfg = getConfig();
  const filename = `${entryId}-image-${index}.jpg`;
  const path = `${cfg.attachmentsPath}/${filename}`;
  const content = stripBase64Prefix(base64);
  await githubFetch(`/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add attachment ${filename}`,
      content,
      branch: cfg.branch,
    }),
  });
  return { id: filename, filename, path };
}
