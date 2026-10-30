import "server-only";

import { CosmosClient, type Container } from "@azure/cosmos";

export type MotorRecord = {
  id: string;
  partitionKey: "motor";
  model: string;
  tahun: number;
  harga: number;
  transmisi: string;
  odometer: number;
  jenis: string;
  pajak: number;
  konsumsiBBM: number;
  mesin: number;
  searchText: string;
};

export type SourceDocument = {
  id: string;
  partitionKey: "brochure";
  filename: string;
  contentType: string;
  text: string;
  uploadedAt: string;
};

let containerPromise: Promise<Container> | undefined;

function setting(...names: string[]) {
  return names.map((name) => process.env[name]?.trim()).find(Boolean);
}

function config() {
  const endpoint = setting("COSMOS_DB_URL", "Cosmos_DB_URL", "AccountEndpoint");
  const key = setting("COSMOS_DB_KEY", "Cosmos_DB_KEY", "AccountKey");
  if (!endpoint || !key) return null;
  return {
    endpoint,
    key,
    database: setting("COSMOS_DB_DATABASE") ?? "ahm-motor-assistant",
    container: setting("COSMOS_DB_CONTAINER") ?? "documents",
  };
}

async function getContainer() {
  if (!containerPromise) {
    containerPromise = (async () => {
      const current = config();
      if (!current) throw new Error("Cosmos DB belum dikonfigurasi.");
      const client = new CosmosClient({ endpoint: current.endpoint, key: current.key });
      const { database } = await client.databases.createIfNotExists({ id: current.database });
      const { container } = await database.containers.createIfNotExists({
        id: current.container,
        partitionKey: { paths: ["/partitionKey"] },
      });
      return container;
    })().catch((error) => {
      containerPromise = undefined;
      throw error;
    });
  }
  return containerPromise;
}

export function cosmosStatus() {
  const current = config();
  return { configured: Boolean(current), database: current?.database ?? null, container: current?.container ?? null };
}

export async function upsertMotorRecords(records: MotorRecord[]) {
  const container = await getContainer();
  for (const record of records) await container.items.upsert(record);
  return records.length;
}

export async function listMotorRecords(limit = 100) {
  const container = await getContainer();
  const { resources } = await container.items.query<MotorRecord>({
    query: `SELECT TOP ${Math.max(1, Math.min(500, limit))} * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.tahun DESC`,
    parameters: [{ name: "@partitionKey", value: "motor" }],
  }).fetchAll();
  return resources;
}

export async function saveSourceDocument(document: SourceDocument) {
  const container = await getContainer();
  await container.items.upsert(document);
  return document;
}

export async function listSourceDocuments() {
  const container = await getContainer();
  const { resources } = await container.items.query<SourceDocument>({
    query: "SELECT * FROM c WHERE c.partitionKey = @partitionKey ORDER BY c.uploadedAt DESC",
    parameters: [{ name: "@partitionKey", value: "brochure" }],
  }).fetchAll();
  return resources;
}
