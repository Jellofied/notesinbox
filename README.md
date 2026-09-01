# Inbox

A private, mobile-first capture application. Open it, dump a thought, send it, and forget about it.

> Capture now. Understand later.

## What it does

Inbox is a frictionless personal capture layer. It stores raw thoughts, ideas, tasks, links, images, and half-formed ideas as Markdown files in a private GitHub repository. Later, an AI agent called **OpenClaw** can pull those files, process them, and move insights into an Obsidian vault.

This app is intentionally minimal:

- No categories, folders, tags, or priorities at capture time.
- No database — GitHub is the persistent store.
- No AI inside the web app.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4

## Prerequisites

- Node.js 20+
- npm (comes with Node.js)
- A private GitHub repository for storage
- A GitHub personal access token with **repo** scope

## Installation

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=Jellofied
GITHUB_REPO=notesinbox
# GITHUB_BRANCH=main
# GITHUB_INBOX_PATH=inbox
# GITHUB_ATTACHMENTS_PATH=attachments
```

### GitHub token setup

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Generate a new token with the **repo** scope.
3. Keep the token secret — it is only used server-side.

### GitHub repository setup

1. Use the existing private repository `Jellofied/notesinbox` (or create a new one).
2. Add a `README.md` if you like.
3. The app will create `inbox/` and `attachments/` directories automatically on first capture.

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Submissions flow through the local Next.js API and write real Markdown files to GitHub:

```text
localhost
  ↓
/api/inbox
  ↓
GitHub API
  ↓
private repo → inbox/YYYY-MM-DD-HHmmss-xxxx.md
```

## Markdown format

Each capture becomes a Markdown file with YAML frontmatter:

```md
---
id: "2026-09-02-184211-a7f3"
createdAt: "2026-09-02T18:42:11+05:30"
source: "web"
status: "unprocessed"
---

I should try using a depth camera for the robotics project.
```

## API routes

- `POST /api/inbox` — create a new capture
- `GET /api/inbox?search=...&limit=...` — list recent captures
- `GET /api/attachments?path=...` — proxy a private attachment image

## Production build

```bash
npm run build
npm start
```

Deploy to [Vercel](https://vercel.com) as a separate project from any existing site. Set the same environment variables in the Vercel dashboard.

## Authentication note

The MVP is designed for local, trusted use. Before exposing the app publicly, add authentication so the inbox and GitHub proxy routes are not open. The UI and API are structured so auth can be added cleanly (for example, via Next.js middleware or a Vercel-integrated auth provider).

## Future integration

- **OpenClaw** will `git pull`, read unprocessed items, run AI processing, update Obsidian notes, mark items as `processed`, and `git push`.
- The web app does not perform AI categorization.

## License

Private — for personal use.
