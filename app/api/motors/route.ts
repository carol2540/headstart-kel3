import { NextResponse } from "next/server";

import { cosmosStatus, listMotorRecords, upsertMotorRecords } from "@/lib/server/cosmos";
import { readMotorCsv } from "@/lib/server/motor-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configured = cosmosStatus().configured;
    const cosmosRecords = configured ? await listMotorRecords() : [];
    const records = cosmosRecords.length > 0 ? cosmosRecords : await readMotorCsv();
    return NextResponse.json({ records, source: cosmosRecords.length > 0 ? "cosmos" : "csv-local", cosmos: cosmosStatus() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const records = await readMotorCsv();
    const count = await upsertMotorRecords(records);
    return NextResponse.json({ success: true, count, message: "Data motor berhasil disimpan ke Cosmos DB." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
