import { extractTextFromPdfBuffer } from "@/lib/resume-parser";

const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIN_RESUME_TEXT_LENGTH = 300;

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === MIME_PDF) {
    return extractTextFromPdfBuffer(buffer);
  }

  if (mimeType === MIME_DOCX) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported resume file type: ${mimeType}. Only PDF and DOCX are supported.`);
}

export function validateResumeText(text: string): { valid: boolean; reason: string | null } {
  if (text.trim().length < MIN_RESUME_TEXT_LENGTH) {
    return {
      valid: false,
      reason:
        "Could not read resume text. The file may be scanned or image-based. Ask the candidate to upload a PDF or DOCX with selectable text.",
    };
  }

  return { valid: true, reason: null };
}
