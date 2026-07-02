import OpenAI from "openai";
import { extractTextFromPdfBuffer } from "@/lib/resume-parser";

const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIN_RESUME_TEXT_LENGTH = 300;

async function extractTextWithOpenAIVision(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured for OCR fallback.");
  }

  const client = new OpenAI({ apiKey });
  const base64 = buffer.toString("base64");

  // gpt-4.1-mini does NOT support input_file for visual PDFs.
  // Try gpt-4.1 (full) first — same billing tier as mini but vision-capable.
  // Fall back to gpt-4o-mini which has confirmed PDF visual support.
  const ocrModels = process.env.OPENAI_OCR_MODEL
    ? [process.env.OPENAI_OCR_MODEL]
    : ["gpt-4.1", "gpt-4o-mini"];

  let lastError: unknown;

  for (const model of ocrModels) {
    try {
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file" as const,
                filename: fileName,
                file_data: `data:${mimeType};base64,${base64}`,
              },
              {
                type: "input_text" as const,
                text: "Extract all text from this document exactly as it appears. Return only the raw text content, preserving line breaks and sections. Do not add any explanation, header, or formatting of your own.",
              },
            ],
          },
        ],
      });

      const text = response.output_text ?? "";
      console.info(`OCR ok: ${text.length} chars | model=${model} | file=${fileName}`);
      return text;
    } catch (err) {
      const status = (err as Record<string, unknown>)?.status ?? "?";
      const code = ((err as Record<string, unknown>)?.error as Record<string, unknown>)?.code ?? "?";
      console.warn(`OCR fail: model=${model} status=${status} code=${code}`);
      lastError = err;
    }
  }

  throw lastError;
}

export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName = "resume",
): Promise<string> {
  if (mimeType === MIME_PDF) {
    // 1. Try pdfjs — fast, free, works for text-based PDFs
    try {
      const text = await extractTextFromPdfBuffer(buffer);

      if (text.trim().length >= MIN_RESUME_TEXT_LENGTH) {
        return text;
      }
    } catch (error) {
      console.warn("pdfjs:", error instanceof Error ? error.message : String(error));
    }

    // 2. Fall back to OpenAI Vision OCR for image-based / scanned PDFs
    try {
      const text = await extractTextWithOpenAIVision(buffer, mimeType, fileName);
      return text;
    } catch (error) {
      const status = (error as Record<string, unknown>)?.status ?? "?";
      const code = ((error as Record<string, unknown>)?.error as Record<string, unknown>)?.code ?? "?";
      console.error(`OCR all models failed: status=${status} code=${code}`);
    }

    return "";
  }

  if (mimeType === MIME_DOCX) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.warn("DOCX:", error instanceof Error ? error.message : String(error));
      return "";
    }
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
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
