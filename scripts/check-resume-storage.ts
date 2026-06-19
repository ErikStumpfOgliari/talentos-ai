import "dotenv/config";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  canCreateSignedResumeUploads,
  createSignedPublicResumeUploadTarget,
} from "../src/lib/resume-storage";

const requiredVariables = [
  "RESUME_STORAGE_S3_BUCKET",
  "RESUME_STORAGE_S3_REGION",
  "RESUME_STORAGE_S3_ENDPOINT",
  "RESUME_STORAGE_S3_ACCESS_KEY_ID",
  "RESUME_STORAGE_S3_SECRET_ACCESS_KEY",
] as const;

function readEnv(name: (typeof requiredVariables)[number]) {
  return process.env[name]?.trim() ?? "";
}

function getMissingVariables() {
  return requiredVariables.filter((name) => !readEnv(name));
}

function getS3Client() {
  return new S3Client({
    credentials: {
      accessKeyId: readEnv("RESUME_STORAGE_S3_ACCESS_KEY_ID"),
      secretAccessKey: readEnv("RESUME_STORAGE_S3_SECRET_ACCESS_KEY"),
    },
    endpoint: readEnv("RESUME_STORAGE_S3_ENDPOINT"),
    forcePathStyle: process.env.RESUME_STORAGE_S3_FORCE_PATH_STYLE === "true",
    region: readEnv("RESUME_STORAGE_S3_REGION"),
  });
}

function extractObjectKey(fileKey: string) {
  const prefix = "s3:";

  if (!fileKey.startsWith(prefix)) {
    throw new Error("Generated resume file key did not use the expected s3: prefix.");
  }

  return fileKey.slice(prefix.length);
}

async function main() {
  const missingVariables = getMissingVariables();

  if (missingVariables.length > 0) {
    console.error("Resume direct upload storage is not configured.");
    console.error(`Missing environment variables: ${missingVariables.join(", ")}`);
    console.error("Add them locally in .env and in Vercel before testing large public resume uploads.");
    process.exit(1);
  }

  if (!canCreateSignedResumeUploads()) {
    console.error("Resume storage variables exist, but the app could not create an S3-compatible client.");
    process.exit(1);
  }

  const target = await createSignedPublicResumeUploadTarget({
    fileName: "aptelys-storage-check.txt",
    mimeType: "text/plain",
    organizationId: "diagnostic",
  });

  if (!target) {
    console.error("The app could not generate a signed resume upload URL.");
    process.exit(1);
  }

  const uploadResponse = await fetch(target.uploadUrl, {
    body: "Aptelys resume storage diagnostic file.\n",
    headers: {
      "Content-Type": "text/plain",
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    console.error(`Signed upload failed with HTTP ${uploadResponse.status}.`);
    console.error("Check bucket name, endpoint, region, access keys, and storage CORS settings.");
    process.exit(1);
  }

  const objectKey = extractObjectKey(target.fileKey);

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: readEnv("RESUME_STORAGE_S3_BUCKET"),
        Key: objectKey,
      }),
    );
  } catch (error) {
    console.warn("Upload worked, but cleanup failed. Delete this diagnostic object manually if it remains:");
    console.warn(objectKey);
    console.warn(error instanceof Error ? error.message : String(error));
  }

  const uploadHost = new URL(target.uploadUrl).host;
  const endpointHost = new URL(readEnv("RESUME_STORAGE_S3_ENDPOINT")).host;

  console.log("Resume storage check passed.");
  console.log(`Bucket: ${readEnv("RESUME_STORAGE_S3_BUCKET")}`);
  console.log(`Region: ${readEnv("RESUME_STORAGE_S3_REGION")}`);
  console.log(`Endpoint host: ${endpointHost}`);
  console.log(`Signed upload host: ${uploadHost}`);
  console.log(`Signed URL expiry: ${target.expiresInSeconds}s`);
  console.log("No secrets or signed URLs were printed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
