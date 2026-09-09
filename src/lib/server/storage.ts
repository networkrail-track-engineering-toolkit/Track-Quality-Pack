import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage abstraction. Uploaded photographs, trace images, CCQ charts and
 * generated exports are written to protected object storage; the database only
 * holds metadata and the storage key.
 *
 * `local` writes to a git-ignored directory and is intended for development.
 * `azure-blob` is selected in Azure and uses a connection string supplied as a
 * protected application setting.
 */

export type StorageProvider = "local" | "azure-blob";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase());
}

function provider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER as StorageProvider) ?? "local";
}

function localRoot(): string {
  return path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage");
}

/** Build an opaque, non-guessable storage key. User input is never used. */
export function buildStorageKey(packId: string, extension: string): string {
  const safeExtension = /^[a-z0-9]{1,8}$/i.test(extension) ? extension.toLowerCase() : "bin";
  return `${packId}/${randomUUID()}.${safeExtension}`;
}

function resolveLocalPath(key: string): string {
  const root = localRoot();
  const resolved = path.resolve(root, key);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function putObject(key: string, data: Buffer, contentType: string): Promise<void> {
  if (provider() === "azure-blob") {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const client = BlobServiceClient.fromConnectionString(
      requiredEnv("AZURE_STORAGE_CONNECTION_STRING"),
    );
    const container = client.getContainerClient(requiredEnv("AZURE_STORAGE_CONTAINER"));
    await container.createIfNotExists();
    await container
      .getBlockBlobClient(key)
      .uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
    return;
  }
  const target = resolveLocalPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function getObject(key: string): Promise<Buffer> {
  if (provider() === "azure-blob") {
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const client = BlobServiceClient.fromConnectionString(
      requiredEnv("AZURE_STORAGE_CONNECTION_STRING"),
    );
    const container = client.getContainerClient(requiredEnv("AZURE_STORAGE_CONTAINER"));
    return container.getBlockBlobClient(key).downloadToBuffer();
  }
  return readFile(resolveLocalPath(key));
}

export async function readTemplate(fileName: string): Promise<Buffer> {
  const templateDir = process.env.TEMPLATE_DIR ?? process.cwd();
  const resolved = path.resolve(templateDir, fileName);
  if (!resolved.startsWith(path.resolve(templateDir))) {
    throw new Error("Invalid template path");
  }
  return readFile(resolved);
}

export function checksum(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
