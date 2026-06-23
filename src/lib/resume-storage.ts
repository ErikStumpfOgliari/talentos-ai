import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type SaveResumeFileInput = {
  bytes: Buffer;
  candidateId: string;
  fileName: string;
  mimeType: string;
  organizationId: string;
};

type StoredResumeFile = {
  fileKey: string;
  fileUrl: string | null;
  sizeBytes: number;
  storageProvider: "local" | "s3";
};

type CreateSignedResumeUploadInput = {
  fileName: string;
  mimeType: string;
  organizationId: string;
};

type SignedResumeUploadTarget = {
  expiresInSeconds: number;
  fileKey: string;
  fileUrl: string | null;
  uploadUrl: string;
};

type ReadResumeFileInput = {
  fileKey: string | null;
  fileUrl: string | null;
};

type ReadResumeFileResult = {
  bytes: Buffer;
  storageProvider: "local" | "remote" | "s3";
};

const LOCAL_STORAGE_PREFIX = "local:";
const S3_STORAGE_PREFIX = "s3:";
const DIRECT_UPLOAD_EXPIRES_IN_SECONDS = 10 * 60;

function canUseLocalResumeStorage() {
  return process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

export function getResumeStorageStatus() {
  const bucket = process.env.RESUME_STORAGE_S3_BUCKET?.trim();
  const accessKeyId = process.env.RESUME_STORAGE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.RESUME_STORAGE_S3_SECRET_ACCESS_KEY?.trim();
  const s3Configured = Boolean(bucket && accessKeyId && secretAccessKey);

  if (s3Configured) {
    return {
      configured: true,
      detail: `S3-compatible bucket ${bucket} is configured for production resume files.`,
      label: "S3-compatible storage",
      provider: "s3" as const,
      status: "S3 ready",
    };
  }

  if (canUseLocalResumeStorage()) {
    return {
      configured: true,
      detail: "Local development storage is active under storage/resumes.",
      label: "Local resume storage",
      provider: "local" as const,
      status: "Local storage",
    };
  }

  return {
    configured: false,
    detail: "Production resume storage is not configured. Set the RESUME_STORAGE_S3_* variables.",
    label: "Production resume storage",
    provider: "s3" as const,
    status: "Storage missing",
  };
}

function getLocalStorageRoot() {
  return join(process.cwd(), "storage", "resumes");
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function buildStorageObjectKey({
  fileName,
  organizationId,
  pathSegment,
}: {
  fileName: string;
  organizationId: string;
  pathSegment: string;
}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeFileName = sanitizeSegment(fileName) || "resume";

  return `organizations/${organizationId}/${pathSegment}/${timestamp}-${randomUUID()}-${safeFileName}`;
}

function buildObjectKey({ candidateId, fileName, organizationId }: Omit<SaveResumeFileInput, "bytes" | "mimeType">) {
  return buildStorageObjectKey({
    fileName,
    organizationId,
    pathSegment: `candidates/${candidateId}`,
  });
}

function buildPublicApplicationObjectKey({ fileName, organizationId }: CreateSignedResumeUploadInput) {
  return buildStorageObjectKey({
    fileName,
    organizationId,
    pathSegment: "public-applications",
  });
}

function getS3Config() {
  const bucket = process.env.RESUME_STORAGE_S3_BUCKET;
  const accessKeyId = process.env.RESUME_STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.RESUME_STORAGE_S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    accessKeyId,
    bucket,
    endpoint: process.env.RESUME_STORAGE_S3_ENDPOINT,
    forcePathStyle: process.env.RESUME_STORAGE_S3_FORCE_PATH_STYLE === "true",
    publicBaseUrl: process.env.RESUME_STORAGE_PUBLIC_BASE_URL,
    region: process.env.RESUME_STORAGE_S3_REGION ?? "us-east-1",
    secretAccessKey,
  };
}

function getS3Client() {
  const config = getS3Config();

  if (!config) {
    return null;
  }

  return {
    bucket: config.bucket,
    client: new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region,
    }),
    publicBaseUrl: config.publicBaseUrl,
  };
}

async function readStreamToBuffer(stream: unknown) {
  if (!stream || typeof stream !== "object" || !("transformToByteArray" in stream)) {
    throw new Error("Stored resume response did not include a readable body.");
  }

  const bytes = await (stream as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(bytes);
}

export function canDownloadStoredResume(fileKey: string | null, fileUrl: string | null) {
  return Boolean(fileUrl || fileKey?.startsWith(LOCAL_STORAGE_PREFIX) || fileKey?.startsWith(S3_STORAGE_PREFIX));
}

export function canCreateSignedResumeUploads() {
  return Boolean(getS3Client());
}

export function isPublicDirectResumeFileKeyForOrganization(fileKey: string | null, organizationId: string) {
  if (!fileKey?.startsWith(S3_STORAGE_PREFIX)) {
    return false;
  }

  const objectKey = fileKey.slice(S3_STORAGE_PREFIX.length);
  return objectKey.startsWith(`organizations/${organizationId}/public-applications/`);
}

export async function createSignedPublicResumeUploadTarget(
  input: CreateSignedResumeUploadInput,
): Promise<SignedResumeUploadTarget | null> {
  const s3 = getS3Client();

  if (!s3) {
    return null;
  }

  const objectKey = buildPublicApplicationObjectKey(input);
  const command = new PutObjectCommand({
    Bucket: s3.bucket,
    ContentType: input.mimeType,
    Key: objectKey,
  });
  const uploadUrl = await getSignedUrl(s3.client, command, {
    expiresIn: DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
  });

  return {
    expiresInSeconds: DIRECT_UPLOAD_EXPIRES_IN_SECONDS,
    fileKey: `${S3_STORAGE_PREFIX}${objectKey}`,
    fileUrl: s3.publicBaseUrl ? `${s3.publicBaseUrl.replace(/\/$/, "")}/${objectKey}` : null,
    uploadUrl,
  };
}

export async function saveResumeFile(input: SaveResumeFileInput): Promise<StoredResumeFile> {
  const objectKey = buildObjectKey(input);
  const s3 = getS3Client();

  if (s3) {
    await s3.client.send(
      new PutObjectCommand({
        Body: input.bytes,
        Bucket: s3.bucket,
        ContentType: input.mimeType,
        Key: objectKey,
      }),
    );

    return {
      fileKey: `${S3_STORAGE_PREFIX}${objectKey}`,
      fileUrl: s3.publicBaseUrl ? `${s3.publicBaseUrl.replace(/\/$/, "")}/${objectKey}` : null,
      sizeBytes: input.bytes.byteLength,
      storageProvider: "s3",
    };
  }

  if (!canUseLocalResumeStorage()) {
    throw new Error("Production resume storage is not configured. Set the RESUME_STORAGE_S3_* variables.");
  }

  const localRoot = getLocalStorageRoot();
  const localPath = join(localRoot, objectKey);
  await mkdir(join(localRoot, "organizations", input.organizationId, "candidates", input.candidateId), { recursive: true });
  await writeFile(localPath, input.bytes);

  return {
    fileKey: `${LOCAL_STORAGE_PREFIX}${objectKey}`,
    fileUrl: null,
    sizeBytes: input.bytes.byteLength,
    storageProvider: "local",
  };
}

export async function readResumeFile({ fileKey, fileUrl }: ReadResumeFileInput): Promise<ReadResumeFileResult> {
  if (fileKey?.startsWith(LOCAL_STORAGE_PREFIX)) {
    const objectKey = fileKey.slice(LOCAL_STORAGE_PREFIX.length);
    return {
      bytes: await readFile(join(getLocalStorageRoot(), objectKey)),
      storageProvider: "local",
    };
  }

  if (fileKey?.startsWith(S3_STORAGE_PREFIX)) {
    const s3 = getS3Client();

    if (!s3) {
      throw new Error("S3 resume storage is not configured.");
    }

    const objectKey = fileKey.slice(S3_STORAGE_PREFIX.length);
    const response = await s3.client.send(
      new GetObjectCommand({
        Bucket: s3.bucket,
        Key: objectKey,
      }),
    );

    return {
      bytes: await readStreamToBuffer(response.Body),
      storageProvider: "s3",
    };
  }

  if (fileUrl) {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error("Stored resume file could not be fetched.");
    }

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      storageProvider: "remote",
    };
  }

  throw new Error("Resume file is not available for download.");
}
