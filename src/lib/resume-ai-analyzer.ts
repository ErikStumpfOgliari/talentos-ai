import Groq from "groq-sdk";
import { z } from "zod";

const AiAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["avancar", "talvez", "rejeitar"]),
  fit_level: z.enum(["baixo", "medio", "alto"]),
  matched_requirements: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  skills_found: z.array(z.string()),
  experience_summary: z.string(),
  risk_points: z.array(z.string()),
  short_summary: z.string(),
  recruiter_explanation: z.string(),
});

export type AiAnalysisResult = z.infer<typeof AiAnalysisSchema>;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return new Groq({ apiKey });
}

function getModel() {
  return process.env.GROQ_RESUME_ANALYZER_MODEL?.trim() ?? "llama-3.1-8b-instant";
}

function buildPrompt(resumeText: string, jobTitle: string, jobDescription: string) {
  return `You are a candidate screening system for a recruiting platform.

Compare the candidate's resume with the job posting below.

Rules:
- Return only valid JSON, no markdown, no explanation outside the JSON.
- Do not use age, gender, photo, appearance, address, marital status, nationality, or any sensitive data in the score.
- Do not invent information not present in the resume.
- Separate found requirements from missing requirements.
- Evaluate only experience, skills, education, certifications, and fit with job requirements.
- Score must be 0 to 100.
- Recommendation must be exactly one of: "avancar", "talvez", "rejeitar".
- fit_level must be exactly one of: "baixo", "medio", "alto".
- Score 80-100 = "alto" fit = "avancar". Score 60-79 = "medio" fit = "talvez". Score 0-59 = "baixo" fit = "rejeitar".

Job title: ${jobTitle}

Job description:
${jobDescription.slice(0, 3000)}

Candidate resume:
${resumeText.slice(0, 6000)}

Return this exact JSON structure:
{
  "score": 0,
  "recommendation": "avancar",
  "fit_level": "alto",
  "matched_requirements": [],
  "missing_requirements": [],
  "skills_found": [],
  "experience_summary": "",
  "risk_points": [],
  "short_summary": "",
  "recruiter_explanation": ""
}`;
}

export async function analyzeResumeWithGroq({
  jobDescription,
  jobTitle,
  resumeText,
}: {
  jobDescription: string;
  jobTitle: string;
  resumeText: string;
}): Promise<AiAnalysisResult> {
  const client = getGroqClient();
  const model = getModel();

  const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: buildPrompt(resumeText, jobTitle, jobDescription) }],
    model,
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("Groq returned an empty response.");
  }

  const parsed = AiAnalysisSchema.parse(JSON.parse(raw));
  return parsed;
}
