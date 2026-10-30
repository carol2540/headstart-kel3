import "server-only";

import OpenAI from "openai";

import type { MotorRecord, SourceDocument } from "@/lib/server/cosmos";
import { formatRupiah } from "@/lib/server/motor-data";

function endpoint(raw?: string) {
  if (!raw) return "";
  const value = raw.trim().replace(/\/+$/, "");
  return value.includes(".services.ai.azure.com/api/projects/") && !value.endsWith("/openai/v1") ? `${value}/openai/v1` : value;
}

function localAnswer(question: string, records: MotorRecord[], brochures: SourceDocument[]) {
  const lower = question.toLocaleLowerCase("id-ID");
  const matching = records.filter((record) => `${record.model} ${record.jenis} ${record.transmisi}`.toLocaleLowerCase("id-ID").includes(lower));
  if (matching.length) {
    return `Saya menemukan ${matching.length} data yang cocok. ${matching.slice(0, 3).map((item) => `${item.model} ${item.tahun} dengan harga ${formatRupiah(item.harga)}, transmisi ${item.transmisi}, dan odometer ${item.odometer.toLocaleString("id-ID")} km`).join("; ")}.`;
  }
  if (lower.includes("vario")) {
    const vario = records.filter((record) => record.model.toLocaleLowerCase("id-ID").includes("vario"));
    return `Ada ${vario.length} data Vario 125 di dataset motor bekas. Rentang harga ${formatRupiah(Math.min(...vario.map((item) => item.harga)))} sampai ${formatRupiah(Math.max(...vario.map((item) => item.harga)))}.`;
  }
  return `Data lokal siap dianalisis: ${records.length} motor dan ${brochures.length} dokumen brosur. Konfigurasikan Azure OpenAI untuk jawaban berbasis AI yang lebih mendalam.`;
}

export async function askMotorAssistant(question: string, records: MotorRecord[], brochures: SourceDocument[]) {
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const baseURL = endpoint(process.env.AZURE_OPENAI_ENDPOINT);
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
  if (!apiKey || !baseURL) return { answer: localAnswer(question, records, brochures), model: "local-fallback" };

  const client = new OpenAI({ apiKey, baseURL });
  const motorContext = records.slice(0, 200).map((item) => `${item.model} | tahun ${item.tahun} | harga ${formatRupiah(item.harga)} | ${item.transmisi} | ${item.odometer} km | ${item.jenis} | mesin ${item.mesin} cc`).join("\n");
  const brochureContext = brochures.map((document) => `Brosur ${document.filename}:\n${document.text.slice(0, 12000)}`).join("\n\n");
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: "Kamu adalah AI assistant untuk analisis data motor bekas dan brosur Honda Vario 125. Jawab dalam Bahasa Indonesia secara ringkas, sebutkan bila informasi tidak ditemukan, dan jangan mengarang angka." },
      { role: "user", content: `Pertanyaan: ${question}\n\nDATA MOTOR:\n${motorContext}\n\nBROSUR:\n${brochureContext || "Belum ada brosur yang diunggah."}` },
    ],
  });
  return { answer: completion.choices[0]?.message?.content || "Model tidak menghasilkan jawaban.", model: deployment };
}
