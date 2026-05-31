import OpenAI from "openai";
import { z } from "zod";

const ParsedResumeSchema = z.object({
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  currentTitle: z.string().nullable(),
  summary: z.string(),
  yearsExperience: z.number().nullable(),
  availability: z.string().nullable(),
  salaryExpectation: z.number().nullable(),
  currency: z.string().nullable(),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
    }),
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      description: z.string().nullable(),
      current: z.boolean(),
    }),
  ),
});

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

type ResumeParserInput =
  | {
      kind: "file";
      fileName: string;
      mimeType: string;
      base64: string;
    }
  | {
      kind: "text";
      fileName: string;
      text: string;
    };

const resumeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "email",
    "phone",
    "location",
    "currentTitle",
    "summary",
    "yearsExperience",
    "availability",
    "salaryExpectation",
    "currency",
    "skills",
    "education",
    "experience",
  ],
  properties: {
    name: { type: "string" },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    currentTitle: { type: ["string", "null"] },
    summary: { type: "string" },
    yearsExperience: { type: ["number", "null"] },
    availability: { type: ["string", "null"] },
    salaryExpectation: { type: ["number", "null"] },
    currency: { type: ["string", "null"] },
    skills: {
      type: "array",
      items: { type: "string" },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["institution", "degree", "field"],
        properties: {
          institution: { type: "string" },
          degree: { type: ["string", "null"] },
          field: { type: ["string", "null"] },
        },
      },
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company", "title", "location", "description", "current"],
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          current: { type: "boolean" },
        },
      },
    },
  },
};

function getResumeParserPrompt() {
  return [
    "Extract a structured recruiting profile from this resume.",
    "Return concise, factual data only.",
    "If a value is not present, use null for nullable fields or an empty array.",
    "Normalize skills to short canonical labels such as React, PostgreSQL, OpenAI, AWS, or Recruiting Ops.",
    "Estimate yearsExperience only when the resume has enough evidence.",
  ].join(" ");
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function canUseOpenAIResumeParser() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function parseResumeWithOpenAI(input: ResumeParserInput) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_RESUME_PARSER_MODEL ?? "gpt-5.4-mini";
  const content =
    input.kind === "file"
      ? [
          {
            type: "input_file" as const,
            filename: input.fileName,
            file_data: `data:${input.mimeType};base64,${input.base64}`,
          },
          {
            type: "input_text" as const,
            text: getResumeParserPrompt(),
          },
        ]
      : [
          {
            type: "input_text" as const,
            text: `${getResumeParserPrompt()}\n\nResume file: ${input.fileName}\n\n${input.text}`,
          },
        ];

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "resume_profile",
        strict: true,
        schema: resumeJsonSchema,
      },
    },
  });

  const parsedJson = JSON.parse(response.output_text);
  const parsed = ParsedResumeSchema.parse(parsedJson);

  return {
    ...parsed,
    skills: [...new Set(parsed.skills.map((skill) => skill.trim()).filter(Boolean))],
  };
}

export function parseResumeLocally(text: string, fileName: string): ParsedResume {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fallbackName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const name = lines.find((line) => !line.includes("@") && line.length <= 80) ?? fallbackName;
  const knownSkills = [
    "React",
    "Next.js",
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Python",
    "PostgreSQL",
    "Prisma",
    "OpenAI",
    "AWS",
    "Docker",
    "Redis",
    "NestJS",
    "Tailwind",
  ];
  const lowerText = text.toLowerCase();
  const skills = knownSkills.filter((skill) => lowerText.includes(skill.toLowerCase()));

  return {
    name,
    email,
    phone,
    location: null,
    currentTitle: null,
    summary: text.slice(0, 420) || "Resume uploaded for recruiter review.",
    yearsExperience: null,
    availability: null,
    salaryExpectation: null,
    currency: "USD",
    skills,
    education: [],
    experience: [],
  };
}
