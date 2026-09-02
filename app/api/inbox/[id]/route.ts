import { NextResponse } from "next/server";
import { deleteInboxEntry, editInboxEntry } from "@/lib/storage/github";
import type { NoteCategory, UpdateInboxInput } from "@/lib/types";

const CATEGORIES: NoteCategory[] = ["office", "personal", "miscellaneous"];

function isCategory(value: unknown): value is NoteCategory {
  return typeof value === "string" && CATEGORIES.includes(value as NoteCategory);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateInboxInput;
    const updates: UpdateInboxInput = {};
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.content === "string") updates.content = body.content.trim();
    if (body.category === null || isCategory(body.category)) {
      updates.category = body.category;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    const entry = await editInboxEntry(id, updates);
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PUT /api/inbox/${id} error:`, message);
    const status = message.includes("Entry not found")
      ? 404
      : message.includes("Only unprocessed")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const entry = await deleteInboxEntry(id);
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`DELETE /api/inbox/${id} error:`, message);
    const status = message.includes("Entry not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}