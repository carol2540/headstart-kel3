import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import DocumentIntelligence from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";

import { cosmosStatus, listSourceDocuments, saveSourceDocument } from "@/lib/server/cosmos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractPdfText(bytes: Buffer) {
  const endpoint = process.env.AZURE_DOC_INTEL_ENDPOINT?.trim().replace(/\/+$/, "");
  const key = process.env.AZURE_DOC_INTEL_KEY?.trim();
  if (!endpoint || !key) return "PDF diunggah. Azure Document Intelligence belum dikonfigurasi untuk ekstraksi teks.";

  const client = DocumentIntelligence(endpoint, new AzureKeyCredential(key), { apiVersion: "2024-11-30" });
  const initial = await client.path("/documentModels/{modelId}:analyze", "prebuilt-layout").post({
    contentType: "application/octet-stream",
    body: bytes,
    queryParameters: { outputContentFormat: "text" },
  });
  if (initial.status !== "202") throw new Error(`Document Intelligence gagal: HTTP ${initial.status}`);
  const operationLocation = initial.headers["operation-location"];
  if (!operationLocation) throw new Error("Document Intelligence tidak mengembalikan operation-location.");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(operationLocation, { headers: { "Ocp-Apim-Subscription-Key": key } });
    if (!response.ok) throw new Error(`Document Intelligence polling gagal: HTTP ${response.status}`);
    const result = await response.json() as { status: string; analyzeResult?: { content?: string }; error?: { message?: string } };
    if (result.status === "succeeded") return result.analyzeResult?.content?.trim() || "Tidak ada teks yang ditemukan pada brosur.";
    if (result.status === "failed") throw new Error(result.error?.message || "Document Intelligence gagal membaca PDF.");
  }
  throw new Error("Document Intelligence timeout setelah 30 detik.");
}

export async function GET() {
  try {
    if (!cosmosStatus().configured) return NextResponse.json({ documents: [], source: "local" });
    return NextResponse.json({ documents: await listSourceDocuments(), source: "cosmos" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "File brosur wajib dipilih." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = file.type === "text/plain" || file.type === "text/csv" ? bytes.toString("utf8") : await extractPdfText(bytes);
    const document = await saveSourceDocument({ id: `brochure-${randomUUID()}`, partitionKey: "brochure", filename: file.name, contentType: file.type || "application/octet-stream", text, uploadedAt: new Date().toISOString() });
    return NextResponse.json({ success: true, document });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
