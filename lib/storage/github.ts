import { createEntryId } from "@/lib/id";
import type { Attachment, CreateInboxInput, InboxEntry, InboxStatus } from "@/lib/types";

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
    content,
    createdAt,
    updatedAt: frontmatter.updatedAt || createdAt,
    source: (frontmatter.source as "web") || "web",
    status,
    attachments,
    processingNotes: frontmatter.processingNotes,
  };
}

export async function createInboxEntry(
  input: CreateInboxInput
): Promise<InboxEntry> {
  const cfg = getConfig();
  const now = new Date();
  const id = createEntryId(now);
  const createdAt = now.toISOString();

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
    content: input.content.trim(),
    createdAt,
    updatedAt: createdAt,
    source: "web",
    status: "unprocessed",
    attachments,
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
  entry.updatedAt = new Date().toISOString();

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
