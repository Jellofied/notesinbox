import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/storage/github";
import type { UpdateTaskInput } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as UpdateTaskInput;
    const updates: UpdateTaskInput = {};
    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.details === "string") {
      updates.details = body.details.trim();
    }
    if (body.status === "pending" || body.status === "completed") {
      updates.status = body.status;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    const task = await updateTask(id, updates);
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PATCH /api/tasks/${id} error:`, message);
    const status = message.includes("Task not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const task = await deleteTask(id);
    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`DELETE /api/tasks/${id} error:`, message);
    const status = message.includes("Task not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}