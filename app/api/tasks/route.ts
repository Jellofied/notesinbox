import { NextResponse } from "next/server";
import { createTask, getTasks } from "@/lib/storage/github";
import type { CreateTaskInput } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const tasks = await getTasks({ limit });
    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/tasks error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTaskInput;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }
    const task = await createTask({
      title,
      details:
        typeof body.details === "string" ? body.details.trim() : undefined,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/tasks error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}