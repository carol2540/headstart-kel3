import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import type { MotorRecord } from "@/lib/server/cosmos";

function numberValue(value: string) {
  return Number(value.trim());
}

export async function readMotorCsv(): Promise<MotorRecord[]> {
  const file = await fs.readFile(path.join(process.cwd(), "Data", "motor_second.csv"), "utf8");
  const lines = file.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",");
    const row = Object.fromEntries(headers.map((header, position) => [header, values[position]?.trim() ?? ""]));
    const model = row.model || "Motor bekas";
    return {
      id: `motor-${index + 1}`,
      partitionKey: "motor",
      model,
      tahun: numberValue(row.tahun),
      harga: numberValue(row.harga),
      transmisi: row.transmisi,
      odometer: numberValue(row.odometer),
      jenis: row.jenis,
      pajak: numberValue(row.pajak),
      konsumsiBBM: numberValue(row.konsumsiBBM),
      mesin: numberValue(row.mesin),
      searchText: Object.values(row).join(" ").toLocaleLowerCase("id-ID"),
    };
  });
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value * 1000);
}
