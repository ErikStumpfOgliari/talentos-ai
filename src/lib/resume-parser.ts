import OpenAI from "openai";
import { z } from "zod";
import { canUseOpenAIProvider } from "@/lib/ai-provider";

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
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export function canUseOpenAIResumeParser() {
  return canUseOpenAIProvider();
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getPdfTextItemPosition(item: PdfTextItem) {
  return {
    x: item.transform?.[4] ?? 0,
    y: item.transform?.[5] ?? 0,
  };
}

function buildTextLinesFromPdfItems(items: PdfTextItem[]) {
  const rows = new Map<number, PdfTextItem[]>();

  items.forEach((item) => {
    if (!item.str?.trim()) {
      return;
    }

    const { y } = getPdfTextItemPosition(item);
    const rowKey = Math.round(y / 4) * 4;
    rows.set(rowKey, [...(rows.get(rowKey) ?? []), item]);
  });

  return [...rows.entries()]
    .sort(([firstY], [secondY]) => secondY - firstY)
    .map(([, rowItems]) =>
      rowItems
        .sort((first, second) => getPdfTextItemPosition(first).x - getPdfTextItemPosition(second).x)
        .map((item) => item.str?.trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean);
}

export async function extractTextFromPdfBuffer(bytes: Buffer | Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = bytes instanceof Buffer ? new Uint8Array(bytes) : bytes;
  const loadingTask = pdfjs.getDocument({
    data,
    disableFontFace: true,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const lines = buildTextLinesFromPdfItems(content.items as PdfTextItem[]);
      pages.push(lines.join("\n"));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  return normalizeResumeText(pages.join("\n\n"));
}

export async function parseResumeWithOpenAI(input: ResumeParserInput) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_RESUME_PARSER_MODEL ?? "gpt-4.1-mini";
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

const SECTION_HEADERS = new Set([
  "certificacoes",
  "competencias",
  "contato",
  "cursos",
  "educacao",
  "experiencia",
  "experiencia profissional",
  "formacao",
  "formacao academica",
  "historico profissional",
  "idiomas",
  "objetivo",
  "perfil",
  "projetos",
  "resumo",
  "skills",
  "sobre",
]);

const TITLE_HINTS = [
  "administrador",
  "analista",
  "assistente",
  "auxiliar",
  "backend",
  "coordenador",
  "developer",
  "desenvolvedor",
  "engineer",
  "engenheiro",
  "estagiario",
  "frontend",
  "full stack",
  "gerente",
  "lider",
  "manager",
  "recruiter",
  "recrutador",
  "software",
  "tecnico",
];

const SKILL_RULES = [
  ["React", ["react", "react.js", "reactjs"]],
  ["Next.js", ["next.js", "nextjs", "next js"]],
  ["Node.js", ["node.js", "nodejs", "node js"]],
  ["TypeScript", ["typescript", "type script"]],
  ["JavaScript", ["javascript", "java script"]],
  ["Python", ["python"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["SQL", [" sql ", "mysql", "sql server", "sqlite"]],
  ["Prisma", ["prisma"]],
  ["Tailwind CSS", ["tailwind"]],
  ["NestJS", ["nestjs", "nest.js"]],
  ["Express", ["express"]],
  ["OpenAI", ["openai", "gpt", "llm"]],
  ["Embeddings", ["embedding", "embeddings"]],
  ["Docker", ["docker"]],
  ["AWS", [" aws ", "amazon web services"]],
  ["Git", [" git ", "github", "gitlab"]],
  ["REST APIs", ["api rest", "rest api", "restful"]],
  ["CRM", [" crm "]],
  ["ATS", [" ats "]],
  ["Excel", ["excel", "planilha"]],
  ["Power BI", ["power bi"]],
  ["Automacao", ["automacao", "automatizacao", "rotinas manuais"]],
  ["Processos", ["processos", "procedimentos"]],
  ["Produtividade", ["produtividade", "gargalos"]],
  ["Logistica", ["logistica", "almoxarifado", "estoque", "expedicao"]],
  ["Operacoes", ["operacoes", "operacional"]],
] as const;

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getResumeLines(text: string) {
  return normalizeResumeText(text)
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
}

function getFallbackName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(curriculo|curriculum|cv|resume)\b/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+\d+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "Candidate";
}

function isSectionHeader(line: string) {
  const normalized = normalizeForSearch(line).replace(/:$/, "");
  return SECTION_HEADERS.has(normalized);
}

function isContactOrAddressLine(line: string) {
  const normalized = normalizeForSearch(line);
  return (
    normalized.includes("@") ||
    normalized.includes("linkedin") ||
    normalized.includes("github") ||
    normalized.includes("telefone") ||
    normalized.includes("celular") ||
    normalized.startsWith("rua ") ||
    normalized.startsWith("avenida ") ||
    normalized.startsWith("av ") ||
    normalized.startsWith("cep ")
  );
}

function extractName(lines: string[], fileName: string) {
  const fallbackName = getFallbackName(fileName);
  const candidates = lines.slice(0, 18).filter((line) => {
    const words = line.split(/\s+/);
    return (
      line.length >= 5 &&
      line.length <= 80 &&
      words.length >= 2 &&
      words.length <= 6 &&
      !/\d/.test(line) &&
      !line.includes("|") &&
      !line.includes(" - ") &&
      !isContactOrAddressLine(line) &&
      !isSectionHeader(line)
    );
  });

  return candidates[0] ?? fallbackName;
}

function extractLocation(lines: string[]) {
  const locationLine =
    lines.find((line) => /\b[A-Z]{2}\b/.test(line) && /,/.test(line)) ??
    lines.find((line) => /,/.test(line) && normalizeForSearch(line).match(/sao paulo|chapeco|curitiba|rio de janeiro|belo horizonte|brasil|brazil|remote|remoto/));

  if (!locationLine) {
    return null;
  }

  const match = locationLine.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,},\s*(?:[A-Z]{2}|[A-Za-zÀ-ÿ\s.'-]{2,}))/);
  return cleanLine(match?.[1] ?? locationLine).slice(0, 90);
}

function extractCurrentTitle(lines: string[], experiences: ParsedResume["experience"]) {
  if (experiences[0]?.title) {
    return experiences[0].title;
  }

  return (
    lines.find((line) => {
      const normalized = normalizeForSearch(line);
      return line.length <= 90 && TITLE_HINTS.some((hint) => normalized.includes(hint));
    }) ?? null
  );
}

function extractSkills(text: string) {
  const searchable = ` ${normalizeForSearch(text)} `;
  const skills = SKILL_RULES.filter(([, patterns]) => patterns.some((pattern) => searchable.includes(` ${normalizeForSearch(pattern)} `) || searchable.includes(normalizeForSearch(pattern)))).map(
    ([skill]) => skill,
  );

  return [...new Set(skills)].slice(0, 18);
}

function extractYearsExperience(text: string) {
  const searchable = normalizeForSearch(text);
  const explicitYears = [...searchable.matchAll(/(\d{1,2})\s+anos?(?:\s+e\s+(\d{1,2})\s+mes(?:es)?)?/g)].map((match) => {
    const years = Number(match[1]);
    const months = Number(match[2] ?? 0);
    return years + months / 12;
  });
  const dateRanges = [...searchable.matchAll(/(\d{2})\/(\d{4})\s*[-–]\s*(?:(\d{2})\/(\d{4})|atual|presente|current)/g)].map((match) => {
    const startMonth = Number(match[1]);
    const startYear = Number(match[2]);
    const endMonth = match[3] ? Number(match[3]) : new Date().getMonth() + 1;
    const endYear = match[4] ? Number(match[4]) : new Date().getFullYear();
    const months = (endYear - startYear) * 12 + (endMonth - startMonth);
    return Math.max(0, months / 12);
  });
  const best = Math.max(0, ...explicitYears, ...dateRanges);

  return best > 0 ? Number(best.toFixed(1)) : null;
}

function getNextUsefulLine(lines: string[], startIndex: number) {
  return lines.slice(startIndex).find((line) => {
    const normalized = normalizeForSearch(line);
    return line.length > 2 && !/^\d+\s+anos?/.test(normalized) && !isSectionHeader(line);
  });
}

function extractExperience(lines: string[]) {
  const experiences: ParsedResume["experience"] = [];

  lines.forEach((line, index) => {
    const rangeMatch = line.match(/^(.+?)\s*\|\s*((?:\d{2}\/\d{4}|\d{4}).*)$/);

    if (!rangeMatch) {
      return;
    }

    const title = cleanLine(rangeMatch[1]);
    const dateText = normalizeForSearch(rangeMatch[2]);
    const companyLine = getNextUsefulLine(lines, index + 1);
    const companyParts = companyLine?.split(/\s+-\s+/) ?? [];
    const company = cleanLine(companyParts[0] ?? "Previous company");
    const location = companyParts[1] ? cleanLine(companyParts.slice(1).join(" - ")) : null;
    const description = lines
      .slice(index + 2, index + 6)
      .filter((item) => !isSectionHeader(item) && !item.includes("|"))
      .join(" ")
      .slice(0, 360);

    experiences.push({
      company,
      current: /atual|presente|current/.test(dateText),
      description: description || null,
      location,
      title,
    });
  });

  return experiences.slice(0, 5);
}

function findSectionLines(lines: string[], headers: string[]) {
  const startIndex = lines.findIndex((line) => headers.includes(normalizeForSearch(line).replace(/:$/, "")));

  if (startIndex < 0) {
    return [];
  }

  const endIndex = lines.findIndex((line, index) => index > startIndex && isSectionHeader(line));
  return lines.slice(startIndex + 1, endIndex > startIndex ? endIndex : startIndex + 8);
}

function extractEducation(lines: string[]) {
  const sectionLines = findSectionLines(lines, ["educacao", "formacao", "formacao academica"]);
  const fallbackLines = lines.filter((line) => {
    const normalized = normalizeForSearch(line);
    return /faculdade|universidade|university|bacharel|tecnologo|tecnico|ensino|graduacao|pos-graduacao|curso/.test(normalized);
  });

  return [...sectionLines, ...fallbackLines]
    .filter((line, index, array) => line.length > 3 && array.indexOf(line) === index && !isSectionHeader(line))
    .slice(0, 3)
    .map((line) => ({
      degree: /bacharel|tecnologo|tecnico|graduacao|ensino|curso/i.test(normalizeForSearch(line)) ? line.slice(0, 120) : null,
      field: null,
      institution: line.slice(0, 120),
    }));
}

function extractSummary(lines: string[], currentTitle: string | null, skills: string[], experience: ParsedResume["experience"]) {
  const objectiveLines = findSectionLines(lines, ["objetivo", "perfil", "resumo", "sobre"]);
  const baseSummary = objectiveLines.join(" ").slice(0, 420);

  if (baseSummary.length >= 80) {
    return baseSummary;
  }

  const parts = [
    currentTitle ? `Current profile: ${currentTitle}.` : null,
    experience[0] ? `Recent experience at ${experience[0].company}.` : null,
    skills.length > 0 ? `Detected skills: ${skills.slice(0, 8).join(", ")}.` : null,
  ].filter(Boolean);

  return parts.join(" ") || lines.filter((line) => !isContactOrAddressLine(line) && !isSectionHeader(line)).join(" ").slice(0, 420) || "Resume uploaded for recruiter review.";
}

export function hasUsefulLocalResumeParse(parsed: ParsedResume) {
  return Boolean(parsed.email || parsed.phone || parsed.skills.length >= 2 || parsed.experience.length > 0 || parsed.education.length > 0);
}

export function parseResumeLocally(text: string, fileName: string): ParsedResume {
  const normalizedText = normalizeResumeText(text);
  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = normalizedText.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const lines = getResumeLines(normalizedText);
  const experience = extractExperience(lines);
  const skills = extractSkills(normalizedText);
  const currentTitle = extractCurrentTitle(lines, experience);

  return {
    name: extractName(lines, fileName),
    email,
    phone,
    location: extractLocation(lines),
    currentTitle,
    summary: extractSummary(lines, currentTitle, skills, experience),
    yearsExperience: extractYearsExperience(normalizedText),
    availability: null,
    salaryExpectation: null,
    currency: "USD",
    skills,
    education: extractEducation(lines),
    experience,
  };
}
