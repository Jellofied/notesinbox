import { NextResponse } from "next/server";
import {
  createInboxEntry,
  getInboxEntries,
} from "@/lib/storage/github";
import type { CreateInboxInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateInboxInput;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content && (!body.attachments || body.attachments.length === 0)) {
      return NextResponse.json(
        { error: "Content or an attachment is required" },
        { status: 400 }
      );
    }
    const entry = await createInboxEntry({
      content: content || "",
      attachments: body.attachments || [],
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/inbox error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entries = await getInboxEntries({ search, limit });
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/inbox error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
