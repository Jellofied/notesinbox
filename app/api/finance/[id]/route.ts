import { NextResponse } from "next/server";
import {
  deleteFinanceLog,
  updateFinanceLog,
} from "@/lib/storage/github";
import type { FinanceType, UpdateFinanceInput } from "@/lib/types";

const TYPES: FinanceType[] = ["expense", "income"];

function isFinanceType(value: unknown): value is FinanceType {
  return typeof value === "string" && TYPES.includes(value as FinanceType);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateFinanceInput;
    const updates: UpdateFinanceInput = {};
    if (typeof body.amount === "string") updates.amount = body.amount.trim();
    if (typeof body.note === "string") updates.note = body.note.trim();
    if (isFinanceType(body.type)) updates.type = body.type;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    const log = await updateFinanceLog(id, updates);
    return NextResponse.json({ log });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PUT /api/finance/${id} error:`, message);
    const status = message.includes("Finance log not found")
      ? 404
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
    const log = await deleteFinanceLog(id);
    return NextResponse.json({ log });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`DELETE /api/finance/${id} error:`, message);
    const status = message.includes("Finance log not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
