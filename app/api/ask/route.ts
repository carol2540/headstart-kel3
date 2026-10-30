import { NextResponse } from "next/server";

import { cosmosStatus, listMotorRecords, listSourceDocuments } from "@/lib/server/cosmos";
import { askMotorAssistant } from "@/lib/server/ai";
import { readMotorCsv } from "@/lib/server/motor-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { question?: string; role?: "user-analis" | "user-super" };
    const question = body.question?.trim();
    const role = body.role ?? "user-analis";
    if (!question) return NextResponse.json({ error: "Pertanyaan wajib diisi." }, { status: 400 });
    const configured = cosmosStatus().configured;
    const cosmosRecords = configured ? await listMotorRecords() : [];
    const records = cosmosRecords.length > 0 ? cosmosRecords : await readMotorCsv();
    const brochures = role === "user-super" && configured ? await listSourceDocuments() : [];
    const result = await askMotorAssistant(question, records, brochures);
    return NextResponse.json({ ...result, source: cosmosRecords.length > 0 ? "cosmos" : "csv-local" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
