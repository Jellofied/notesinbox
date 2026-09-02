import { NextResponse } from "next/server";
import { createFinanceLog, getFinanceLogs } from "@/lib/storage/github";
import type { CreateFinanceInput, FinanceType } from "@/lib/types";

const TYPES: FinanceType[] = ["expense", "income"];

function isFinanceType(value: unknown): value is FinanceType {
  return typeof value === "string" && TYPES.includes(value as FinanceType);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const logs = await getFinanceLogs({ limit });
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/finance error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateFinanceInput;
    const amount =
      typeof body.amount === "string" ? body.amount.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }
    const log = await createFinanceLog({
      amount,
      note,
      type: isFinanceType(body.type) ? body.type : "expense",
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/finance error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
