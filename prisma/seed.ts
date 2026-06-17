import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ApplicationStatus,
  AutomationTrigger,
  CalendarSyncStatus,
  CandidateSource,
  EmailStatus,
  EmailTrigger,
  EmploymentType,
  InterviewStatus,
  InterviewType,
  JobStatus,
  MembershipRole,
  MembershipStatus,
  NoteVisibility,
  ParserStatus,
  PipelineCategory,
  PrismaClient,
  WorkMode,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/passwords";
import { encryptSecret } from "../src/lib/secure-token";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const organizationSlug = "northstar-recruiting";
const demoPassword = "aptelys-demo-2026";
const now = new Date();
const seedDemoData = process.env.SEED_DEMO_DATA === "true";
const organizationName = seedDemoData ? "Northstar Recruiting" : "Aptelys";

type JobKey = "aiProduct" | "backend" | "fullstack" | "recruitingOps";

const users = [
  {
    name: "Erik Santos",
    email: "erik@example.com",
    password: demoPassword,
    role: MembershipRole.OWNER,
    status: MembershipStatus.ACTIVE,
  },
  {
    name: "Marina Lopes",
    email: "marina@example.com",
    password: demoPassword,
    role: MembershipRole.ADMIN,
    status: MembershipStatus.ACTIVE,
  },
  {
    name: "Theo Almeida",
    email: "theo@example.com",
    password: demoPassword,
    role: MembershipRole.RECRUITER,
    status: MembershipStatus.ACTIVE,
  },
  {
    name: "Sofia Chen",
    email: "sofia@example.com",
    password: demoPassword,
    role: MembershipRole.HIRING_MANAGER,
    status: MembershipStatus.ACTIVE,
  },
  {
    name: "Livia Pereira",
    email: "livia@example.com",
    password: demoPassword,
    role: MembershipRole.VIEWER,
    status: MembershipStatus.INVITED,
  },
  {
    name: "Diego Costa",
    email: "diego.ops@example.com",
    password: demoPassword,
    role: MembershipRole.RECRUITER,
    status: MembershipStatus.DISABLED,
  },
];

const jobSeeds: Array<{
  key: JobKey;
  createdDaysAgo: number;
  department: string;
  description: string;
  employmentType: EmploymentType;
  hiringManagerEmail: string;
  location: string;
  openings: number;
  publishedDaysAgo?: number;
  requirements: string[];
  responsibilities: string[];
  salaryMax: number;
  salaryMin: number;
  status: JobStatus;
  title: string;
  workMode: WorkMode;
}> = [
  {
    key: "fullstack",
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    location: "Remote LATAM",
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.FULL_TIME,
    status: JobStatus.ACTIVE,
    openings: 2,
    salaryMin: 68000,
    salaryMax: 94000,
    description:
      "Own end-to-end product delivery for an AI recruitment platform with React, Node.js, PostgreSQL, calendar integrations, and AI-assisted resume workflows.",
    requirements: ["React", "Next.js", "Node.js", "PostgreSQL", "Prisma", "OpenAI", "SaaS architecture"],
    responsibilities: [
      "Ship full-stack product features across recruiter and candidate workflows",
      "Design resilient APIs, server actions, and database models",
      "Integrate AI parsing and matching into production hiring workflows",
    ],
    hiringManagerEmail: "sofia@example.com",
    createdDaysAgo: 58,
    publishedDaysAgo: 44,
  },
  {
    key: "aiProduct",
    title: "AI Product Engineer",
    department: "AI Platform",
    location: "Hybrid Lisbon",
    workMode: WorkMode.HYBRID,
    employmentType: EmploymentType.FULL_TIME,
    status: JobStatus.ACTIVE,
    openings: 1,
    salaryMin: 76000,
    salaryMax: 106000,
    description:
      "Build LLM-powered extraction, matching, ranking, and review experiences for recruiters using TypeScript, OpenAI APIs, embeddings, and product analytics.",
    requirements: ["OpenAI", "Embeddings", "TypeScript", "Product engineering", "Vector Search", "UX"],
    responsibilities: [
      "Prototype AI-assisted recruiter workflows",
      "Evaluate candidate ranking quality and explainability",
      "Ship polished product UI for review-heavy workflows",
    ],
    hiringManagerEmail: "marina@example.com",
    createdDaysAgo: 42,
    publishedDaysAgo: 31,
  },
  {
    key: "recruitingOps",
    title: "Recruiting Operations Manager",
    department: "People",
    location: "Remote Brazil",
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.FULL_TIME,
    status: JobStatus.ACTIVE,
    openings: 1,
    salaryMin: 52000,
    salaryMax: 72000,
    description:
      "Lead recruiting operations, candidate communication workflows, ATS governance, funnel reporting, and hiring team enablement for a scaling SaaS company.",
    requirements: ["ATS Ops", "Analytics", "Automation", "Stakeholder Mgmt", "Process Design"],
    responsibilities: [
      "Improve recruiter throughput and candidate experience",
      "Own pipeline hygiene, templates, SLAs, and reporting",
      "Partner with hiring managers on process quality",
    ],
    hiringManagerEmail: "marina@example.com",
    createdDaysAgo: 27,
    publishedDaysAgo: 20,
  },
  {
    key: "backend",
    title: "Backend Platform Engineer",
    department: "Engineering",
    location: "Remote Brazil",
    workMode: WorkMode.REMOTE,
    employmentType: EmploymentType.FULL_TIME,
    status: JobStatus.DRAFT,
    openings: 1,
    salaryMin: 62000,
    salaryMax: 85000,
    description:
      "Design APIs, queueing, database performance, integration infrastructure, and background processing foundations for a recruiting automation platform.",
    requirements: ["NestJS", "Prisma", "PostgreSQL", "Docker", "AWS", "Queues"],
    responsibilities: [
      "Build integration-safe backend APIs",
      "Own database performance and queue reliability",
      "Prepare background jobs for production hiring workflows",
    ],
    hiringManagerEmail: "theo@example.com",
    createdDaysAgo: 12,
  },
];

const pipelineTemplate = [
  { name: "Applied", category: PipelineCategory.APPLIED, position: 0 },
  { name: "Screening", category: PipelineCategory.SCREENING, position: 1 },
  { name: "Interview", category: PipelineCategory.INTERVIEW, position: 2 },
  { name: "Offer", category: PipelineCategory.OFFER, position: 3 },
  { name: "Hired", category: PipelineCategory.HIRED, position: 4 },
  { name: "Rejected", category: PipelineCategory.REJECTED, position: 5 },
];

const candidateSeeds = [
  {
    name: "Ana Martins",
    email: "ana.martins@example.com",
    phone: "+55 11 90000-0101",
    location: "Sao Paulo, BR",
    source: CandidateSource.LINKEDIN,
    currentTitle: "Senior Full Stack Engineer",
    yearsExperience: 8,
    availability: "2 weeks",
    salaryExpectation: 88000,
    summary:
      "Senior product engineer who has shipped multi-tenant SaaS platforms with React, Node.js, PostgreSQL, Redis queues, and AI-assisted document workflows.",
    skills: ["React", "Next.js", "Node.js", "PostgreSQL", "Prisma", "OpenAI", "Redis"],
    education: [{ institution: "Universidade de Sao Paulo", degree: "B.S.", field: "Computer Science" }],
    experience: [
      {
        company: "Atlas Cloud",
        title: "Senior Full Stack Engineer",
        yearsAgoStart: 4,
        current: true,
        description: "Led tenant-aware product architecture, onboarding flows, and document automation features.",
      },
      {
        company: "ContaFlow",
        title: "Software Engineer",
        yearsAgoStart: 8,
        yearsAgoEnd: 4,
        description: "Built React dashboards, Node.js APIs, and PostgreSQL reporting features.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.INTERVIEW,
        status: ApplicationStatus.ACTIVE,
        score: 96,
        position: 0,
        appliedDaysAgo: 26,
        stageEnteredDaysAgo: 5,
        publicToken: "demo-ana-fullstack-status",
        strengths: ["Excellent SaaS architecture overlap", "Strong React/Node/PostgreSQL match", "Has shipped AI-assisted document workflows"],
        gaps: ["Validate team leadership depth in final interview"],
        notes: ["Top technical fit for the flagship engineering role.", "Ask for examples of AI evaluation tradeoffs."],
      },
      {
        job: "aiProduct" as JobKey,
        category: PipelineCategory.SCREENING,
        status: ApplicationStatus.ACTIVE,
        score: 88,
        position: 2,
        appliedDaysAgo: 18,
        stageEnteredDaysAgo: 7,
        strengths: ["Strong OpenAI workflow experience", "Product-minded full-stack background"],
        gaps: ["Less specialized in ranking evaluation than top AI candidates"],
      },
    ],
  },
  {
    name: "Bianca Costa",
    email: "bianca.costa@example.com",
    phone: "+351 900 000 120",
    location: "Lisbon, PT",
    source: CandidateSource.INBOUND,
    currentTitle: "AI Product Engineer",
    yearsExperience: 7,
    availability: "30 days",
    salaryExpectation: 98000,
    summary:
      "AI product engineer focused on LLM extraction, recommendations, embeddings, and explainable matching for B2B workflow products.",
    skills: ["Python", "OpenAI", "Embeddings", "TypeScript", "Vector Search", "UX", "Product engineering"],
    education: [{ institution: "Universidade Nova de Lisboa", degree: "M.S.", field: "Data Science" }],
    experience: [
      {
        company: "SignalHire Labs",
        title: "AI Product Engineer",
        yearsAgoStart: 3,
        current: true,
        description: "Built resume extraction, matching experiments, evaluator dashboards, and prompt iteration workflows.",
      },
      {
        company: "Flowdesk",
        title: "Data Product Engineer",
        yearsAgoStart: 7,
        yearsAgoEnd: 3,
        description: "Shipped recommendations, analytics, and human-in-the-loop review systems.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "aiProduct" as JobKey,
        category: PipelineCategory.OFFER,
        status: ApplicationStatus.ACTIVE,
        score: 97,
        position: 0,
        appliedDaysAgo: 23,
        stageEnteredDaysAgo: 3,
        publicToken: "demo-bianca-ai-status",
        strengths: ["Best AI workflow fit", "Direct embeddings and evaluation experience", "Strong product communication"],
        gaps: ["Confirm compensation expectations before offer approval"],
        notes: ["Offer packet is being prepared.", "Hiring manager wants one more portfolio walkthrough."],
      },
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.OFFER,
        status: ApplicationStatus.ACTIVE,
        score: 92,
        position: 0,
        appliedDaysAgo: 22,
        stageEnteredDaysAgo: 4,
        strengths: ["High AI/product overlap", "Strong TypeScript background"],
        gaps: ["Less backend platform ownership than Ana"],
      },
    ],
  },
  {
    name: "Mateus Rocha",
    email: "mateus.rocha@example.com",
    phone: "+55 41 90000-0112",
    location: "Curitiba, BR",
    source: CandidateSource.REFERRAL,
    currentTitle: "Backend Platform Engineer",
    yearsExperience: 6,
    availability: "Immediate",
    salaryExpectation: 76000,
    summary:
      "Backend engineer with strong API, Prisma, PostgreSQL, Docker, queueing, and reliability experience for workflow-heavy SaaS products.",
    skills: ["NestJS", "Prisma", "PostgreSQL", "Docker", "AWS", "Queues", "Node.js"],
    education: [{ institution: "UTFPR", degree: "B.S.", field: "Software Engineering" }],
    experience: [
      {
        company: "Borda Systems",
        title: "Backend Platform Engineer",
        yearsAgoStart: 2,
        current: true,
        description: "Designed queue-backed integrations, API reliability tooling, and PostgreSQL performance improvements.",
      },
      {
        company: "NuvemPay",
        title: "Software Engineer",
        yearsAgoStart: 6,
        yearsAgoEnd: 2,
        description: "Built internal tooling with NestJS, Docker, and AWS.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.SCREENING,
        status: ApplicationStatus.ACTIVE,
        score: 90,
        position: 0,
        appliedDaysAgo: 12,
        stageEnteredDaysAgo: 2,
        publicToken: "demo-mateus-fullstack-status",
        strengths: ["Excellent backend reliability fit", "Strong Prisma/PostgreSQL overlap", "Available immediately"],
        gaps: ["Validate frontend depth for a full-stack ownership role"],
        notes: ["Send self-scheduling link for technical screen.", "Referral from a trusted senior engineer."],
      },
      {
        job: "backend" as JobKey,
        category: PipelineCategory.APPLIED,
        status: ApplicationStatus.ACTIVE,
        score: 94,
        position: 0,
        appliedDaysAgo: 5,
        stageEnteredDaysAgo: 5,
        strengths: ["Direct platform engineering match", "Strong queues and Docker experience"],
        gaps: ["Role is still in draft"],
      },
    ],
  },
  {
    name: "Rafael Lima",
    email: "rafael.lima@example.com",
    phone: "+55 48 90000-0184",
    location: "Florianopolis, BR",
    source: CandidateSource.CAREERS_PAGE,
    currentTitle: "Frontend Engineer",
    yearsExperience: 5,
    availability: "3 weeks",
    salaryExpectation: 64000,
    summary:
      "Frontend engineer focused on dashboard UX, design systems, accessibility, data-dense SaaS screens, and testing discipline.",
    skills: ["React", "Tailwind", "Design Systems", "Accessibility", "Charts", "Testing"],
    education: [{ institution: "UFSC", degree: "B.S.", field: "Information Systems" }],
    experience: [
      {
        company: "DataBoard",
        title: "Frontend Engineer",
        yearsAgoStart: 2,
        current: true,
        description: "Built analytics dashboards, component systems, and accessibility improvements for internal SaaS tools.",
      },
      {
        company: "MobiDesk",
        title: "UI Engineer",
        yearsAgoStart: 5,
        yearsAgoEnd: 2,
        description: "Implemented design system primitives and chart-heavy workflows.",
      },
    ],
    resumeStatus: ParserStatus.NEEDS_REVIEW,
    resumeReviewed: false,
    parsedOverrides: {
      currentTitle: "Frontend Platform Engineer",
      skills: ["React", "Tailwind", "Design Systems", "Accessibility", "Charts", "Testing", "Next.js"],
      summary:
        "Frontend platform engineer with measurable impact in analytics UI, design systems, accessibility remediation, and Next.js adoption.",
    },
    applications: [
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.APPLIED,
        status: ApplicationStatus.ACTIVE,
        score: 78,
        position: 0,
        appliedDaysAgo: 1,
        stageEnteredDaysAgo: 1,
        publicToken: "demo-rafael-fullstack-status",
        strengths: ["Strong dashboard UX and React experience", "Good fit for frontend-heavy product surfaces"],
        gaps: ["Needs backend depth validation", "Resume parser found new Next.js signal that requires review"],
        notes: ["Resume needs manual review before moving forward."],
      },
    ],
  },
  {
    name: "Camila Nunes",
    email: "camila.nunes@example.com",
    phone: "+55 21 90000-0144",
    location: "Rio de Janeiro, BR",
    source: CandidateSource.TALENT_POOL,
    currentTitle: "Recruiting Operations Lead",
    yearsExperience: 9,
    availability: "45 days",
    salaryExpectation: 68000,
    summary:
      "Recruiting operations leader with ATS governance, candidate communication automation, recruiter analytics, and process design experience.",
    skills: ["ATS Ops", "Analytics", "Automation", "Stakeholder Mgmt", "Process Design"],
    education: [{ institution: "PUC-Rio", degree: "B.A.", field: "Business Administration" }],
    experience: [
      {
        company: "ScalePeople",
        title: "Recruiting Operations Lead",
        yearsAgoStart: 4,
        current: true,
        description: "Owned ATS hygiene, scorecards, SLA reporting, templates, and hiring manager enablement.",
      },
      {
        company: "HireWave",
        title: "Senior Recruiter",
        yearsAgoStart: 9,
        yearsAgoEnd: 4,
        description: "Built candidate communication playbooks for engineering and GTM hiring.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "recruitingOps" as JobKey,
        category: PipelineCategory.OFFER,
        status: ApplicationStatus.ACTIVE,
        score: 91,
        position: 0,
        appliedDaysAgo: 17,
        stageEnteredDaysAgo: 2,
        publicToken: "demo-camila-ops-status",
        strengths: ["Direct ATS operations fit", "Strong automation and analytics background", "Excellent stakeholder management"],
        gaps: ["Confirm availability timing with People team"],
        notes: ["Best candidate for recruiting operations role.", "Prepare compensation approval."],
      },
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.SCREENING,
        status: ApplicationStatus.ACTIVE,
        score: 67,
        position: 1,
        appliedDaysAgo: 9,
        stageEnteredDaysAgo: 7,
        strengths: ["Strong product/process insight for HRTech"],
        gaps: ["Not an engineering profile; route to Recruiting Ops instead"],
      },
    ],
  },
  {
    name: "Nina Park",
    email: "nina.park@example.com",
    phone: "+1 415 900 0190",
    location: "San Francisco, US",
    source: CandidateSource.LINKEDIN,
    currentTitle: "Machine Learning Product Engineer",
    yearsExperience: 6,
    availability: "30 days",
    salaryExpectation: 104000,
    summary:
      "ML product engineer who has built semantic search, embeddings evaluation, recommendation systems, and human review tools for enterprise products.",
    skills: ["Python", "OpenAI", "Embeddings", "Vector Search", "Analytics", "Product engineering"],
    education: [{ institution: "UC Berkeley", degree: "M.S.", field: "Information and Data Science" }],
    experience: [
      {
        company: "Orbital AI",
        title: "Machine Learning Product Engineer",
        yearsAgoStart: 3,
        current: true,
        description: "Built embedding-based retrieval, evaluator dashboards, and review workflows for AI product teams.",
      },
      {
        company: "BrightSearch",
        title: "Search Engineer",
        yearsAgoStart: 6,
        yearsAgoEnd: 3,
        description: "Implemented semantic search, ranking experiments, and analytics instrumentation.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "aiProduct" as JobKey,
        category: PipelineCategory.INTERVIEW,
        status: ApplicationStatus.ACTIVE,
        score: 93,
        position: 0,
        appliedDaysAgo: 14,
        stageEnteredDaysAgo: 4,
        publicToken: "demo-nina-ai-status",
        strengths: ["Strong embeddings and ranking evaluation fit", "Hands-on product analytics background"],
        gaps: ["Confirm willingness to work Lisbon overlap hours"],
        notes: ["Schedule final technical conversation with AI Platform team."],
      },
    ],
  },
  {
    name: "Diego Herrera",
    email: "diego.herrera@example.com",
    phone: "+52 55 9000 0222",
    location: "Mexico City, MX",
    source: CandidateSource.REFERRAL,
    currentTitle: "Staff Full Stack Engineer",
    yearsExperience: 10,
    availability: "Immediate",
    salaryExpectation: 92000,
    summary:
      "Staff engineer with a track record of owning multi-tenant architecture, migration strategy, observability, and full-stack delivery in B2B SaaS.",
    skills: ["React", "Node.js", "PostgreSQL", "SaaS architecture", "AWS", "Testing"],
    education: [{ institution: "Tecnologico de Monterrey", degree: "B.S.", field: "Computer Systems" }],
    experience: [
      {
        company: "Northwind SaaS",
        title: "Staff Full Stack Engineer",
        yearsAgoStart: 5,
        current: true,
        description: "Led tenant isolation, observability, migrations, and cross-functional engineering delivery.",
      },
      {
        company: "ContaPlus",
        title: "Senior Software Engineer",
        yearsAgoStart: 10,
        yearsAgoEnd: 5,
        description: "Built B2B workflows with React, Node.js, and PostgreSQL.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.HIRED,
        status: ApplicationStatus.HIRED,
        score: 95,
        position: 0,
        appliedDaysAgo: 39,
        stageEnteredDaysAgo: 6,
        hiredDaysAgo: 4,
        publicToken: "demo-diego-fullstack-status",
        strengths: ["Staff-level SaaS architecture", "Excellent delivery and reliability signals", "Immediate availability"],
        gaps: ["Hired; ensure onboarding plan is documented"],
        notes: ["Accepted offer and moved to onboarding.", "Great example for time-to-hire analytics."],
      },
    ],
  },
  {
    name: "Lucas Almeida",
    email: "lucas.almeida@example.com",
    phone: "+55 31 90000-0177",
    location: "Belo Horizonte, BR",
    source: CandidateSource.INDEED,
    currentTitle: "Full Stack Developer",
    yearsExperience: 4,
    availability: "Immediate",
    salaryExpectation: 54000,
    summary:
      "Full-stack developer with solid CRUD product experience, React interfaces, Express APIs, and early PostgreSQL exposure.",
    skills: ["React", "Express", "JavaScript", "PostgreSQL", "Testing"],
    education: [{ institution: "UFMG", degree: "B.S.", field: "Information Systems" }],
    experience: [
      {
        company: "MercadoLocal",
        title: "Full Stack Developer",
        yearsAgoStart: 4,
        current: true,
        description: "Built commerce dashboards and operational APIs for internal teams.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "fullstack" as JobKey,
        category: PipelineCategory.REJECTED,
        status: ApplicationStatus.REJECTED,
        score: 61,
        position: 0,
        appliedDaysAgo: 21,
        stageEnteredDaysAgo: 8,
        rejectedDaysAgo: 7,
        publicToken: "demo-lucas-fullstack-status",
        strengths: ["Good general full-stack foundation", "Immediate availability"],
        gaps: ["Below seniority bar for this role", "Limited AI and architecture ownership"],
        notes: ["Rejected after screen; keep warm for mid-level roles."],
      },
    ],
  },
  {
    name: "Livia Pereira",
    email: "candidate.livia@example.com",
    phone: "+55 11 90000-0303",
    location: "Sao Paulo, BR",
    source: CandidateSource.CAREERS_PAGE,
    currentTitle: "People Operations Specialist",
    yearsExperience: 6,
    availability: "2 weeks",
    salaryExpectation: 61000,
    summary:
      "People operations specialist experienced in interview coordination, recruiter enablement, HR analytics, and candidate communications.",
    skills: ["ATS Ops", "Analytics", "Automation", "Stakeholder Mgmt"],
    education: [{ institution: "FGV", degree: "B.A.", field: "People Management" }],
    experience: [
      {
        company: "PeopleHub",
        title: "People Operations Specialist",
        yearsAgoStart: 3,
        current: true,
        description: "Managed interview logistics, recruiting dashboards, templates, and candidate communication SLAs.",
      },
      {
        company: "TalentBridge",
        title: "Recruiting Coordinator",
        yearsAgoStart: 6,
        yearsAgoEnd: 3,
        description: "Coordinated high-volume engineering interview loops and candidate updates.",
      },
    ],
    resumeStatus: ParserStatus.PARSED,
    resumeReviewed: true,
    applications: [
      {
        job: "recruitingOps" as JobKey,
        category: PipelineCategory.SCREENING,
        status: ApplicationStatus.ACTIVE,
        score: 83,
        position: 0,
        appliedDaysAgo: 3,
        stageEnteredDaysAgo: 1,
        publicToken: "demo-livia-ops-status",
        strengths: ["Strong coordination and analytics fit", "Good candidate communication experience"],
        gaps: ["Less strategic ownership than Camila"],
        notes: ["Good backup candidate for operations role."],
      },
    ],
  },
  {
    name: "Joao Pereira",
    email: "joao.pereira@example.com",
    phone: "+55 85 90000-0404",
    location: "Fortaleza, BR",
    source: CandidateSource.CAREERS_PAGE,
    currentTitle: "DevOps Engineer",
    yearsExperience: 5,
    availability: "Immediate",
    salaryExpectation: 67000,
    summary:
      "DevOps engineer with Docker, AWS, CI/CD, observability, and infrastructure automation experience for growing SaaS teams.",
    skills: ["Docker", "AWS", "Queues", "PostgreSQL", "Testing"],
    education: [{ institution: "UFC", degree: "B.S.", field: "Computer Engineering" }],
    experience: [
      {
        company: "CloudOps BR",
        title: "DevOps Engineer",
        yearsAgoStart: 5,
        current: true,
        description: "Owned deployment pipelines, Docker environments, monitoring, and reliability automation.",
      },
    ],
    resumeStatus: ParserStatus.FAILED,
    resumeReviewed: false,
    parsedOverrides: {
      source: "parser-error",
      message: "The uploaded resume image was too low-resolution for reliable extraction.",
      summary: "Parsing failed. Recruiter should request a cleaner PDF before matching deeply.",
      skills: ["Docker", "AWS", "CI/CD"],
    },
    applications: [
      {
        job: "backend" as JobKey,
        category: PipelineCategory.APPLIED,
        status: ApplicationStatus.ACTIVE,
        score: 76,
        position: 1,
        appliedDaysAgo: 2,
        stageEnteredDaysAgo: 2,
        publicToken: "demo-joao-backend-status",
        strengths: ["Strong infrastructure and Docker overlap", "Useful reliability background"],
        gaps: ["Resume extraction failed", "Validate backend API ownership"],
        notes: ["Ask candidate to upload a text-based PDF."],
      },
    ],
  },
];

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 86_400_000);
}

function daysFromNow(days: number) {
  return new Date(now.getTime() + days * 86_400_000);
}

function hoursFromNow(hours: number) {
  return new Date(now.getTime() + hours * 3_600_000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildResumeText(candidate: (typeof candidateSeeds)[number]) {
  return [
    candidate.name,
    candidate.currentTitle,
    candidate.email,
    candidate.phone,
    candidate.location,
    candidate.summary,
    `Skills: ${candidate.skills.join(", ")}`,
    `Experience: ${candidate.yearsExperience} years`,
  ].join("\n");
}

function buildParsedResumeData(candidate: (typeof candidateSeeds)[number]) {
  return Object.assign({
    availability: candidate.availability,
    currency: "USD",
    currentTitle: candidate.currentTitle,
    education: candidate.education,
    email: candidate.email,
    experience: candidate.experience.map((experience) => ({
      company: experience.company,
      current: Boolean(experience.current),
      description: experience.description,
      title: experience.title,
    })),
    location: candidate.location,
    name: candidate.name,
    phone: candidate.phone,
    salaryExpectation: candidate.salaryExpectation,
    skills: candidate.skills,
    source: "seeded-openai-resume-parser",
    summary: candidate.summary,
    yearsExperience: candidate.yearsExperience,
  }, candidate.parsedOverrides ?? {});
}

function buildMatchExplanation({
  gaps,
  matchedSkills,
  missingSkills,
  notes,
  score,
  strengths,
}: {
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  notes?: string[];
  score: number;
  strengths: string[];
}) {
  const skillCoverage = matchedSkills.length / Math.max(1, matchedSkills.length + missingSkills.length);

  return {
    mode: "local" as const,
    generatedAt: now.toISOString(),
    score,
    strengths,
    gaps,
    matchedSkills,
    missingSkills,
    notes: notes ?? [],
    signals: {
      desiredYears: 5,
      experienceFit: Math.min(1, score / 90),
      profileCompleteness: 0.95,
      semanticSimilarity: Math.min(0.98, score / 100),
      skillCoverage: Number(skillCoverage.toFixed(2)),
      titleFit: Math.min(0.95, score / 100),
    },
  };
}

async function clearOrganizationData(organizationId: string) {
  await prisma.auditEvent.deleteMany({ where: { organizationId } });
  await prisma.emailMessage.deleteMany({ where: { organizationId } });
  await prisma.automationRule.deleteMany({ where: { organizationId } });
  await prisma.schedulingLink.deleteMany({ where: { organizationId } });
  await prisma.userAvailability.deleteMany({ where: { organizationId } });
  await prisma.calendarConnection.deleteMany({ where: { organizationId } });
  await prisma.interview.deleteMany({ where: { organizationId } });
  await prisma.candidateNote.deleteMany({ where: { organizationId } });
  await prisma.application.deleteMany({ where: { organizationId } });
  await prisma.pipelineStage.deleteMany({ where: { organizationId } });
  await prisma.embedding.deleteMany({ where: { organizationId } });
  await prisma.resumeDocument.deleteMany({ where: { organizationId } });
  await prisma.candidateSkill.deleteMany({ where: { organizationId } });
  await prisma.candidate.deleteMany({ where: { organizationId } });
  await prisma.skill.deleteMany({ where: { organizationId } });
  await prisma.emailTemplate.deleteMany({ where: { organizationId } });
  await prisma.job.deleteMany({ where: { organizationId } });
  await prisma.membership.deleteMany({ where: { organizationId } });
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: organizationSlug },
    update: {
      name: organizationName,
      plan: "PRO",
      timezone: "America/Sao_Paulo",
    },
    create: {
      name: organizationName,
      slug: organizationSlug,
      plan: "PRO",
      timezone: "America/Sao_Paulo",
    },
  });

  await clearOrganizationData(organization.id);

  const userIds = new Map<string, string>();
  const seedUsers = seedDemoData ? users : [users[0]];

  for (const user of seedUsers) {
    const passwordHash = await hashPassword(user.password);
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
      },
    });

    userIds.set(user.email, createdUser.id);

    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: createdUser.id,
        role: user.role,
        status: user.status,
        invitedAt: user.status === MembershipStatus.INVITED ? daysAgo(3) : daysAgo(35),
        joinedAt: user.status === MembershipStatus.ACTIVE ? daysAgo(34) : null,
      },
    });
  }

  const ownerId = userIds.get("erik@example.com") ?? null;
  const adminId = userIds.get("marina@example.com") ?? null;
  const recruiterId = userIds.get("theo@example.com") ?? null;

  for (const [email, settings] of [
    ["erik@example.com", { start: 9, end: 17, days: [1, 2, 3, 4, 5] }],
    ["theo@example.com", { start: 10, end: 18, days: [1, 2, 3, 4, 5] }],
    ["sofia@example.com", { start: 8, end: 16, days: [1, 2, 3, 4] }],
  ] as const) {
    const userId = userIds.get(email);

    if (!userId) {
      continue;
    }

    await prisma.userAvailability.create({
      data: {
        bufferAfterMinutes: 15,
        defaultDurationMinutes: 45,
        maxDaysAhead: 12,
        organizationId: organization.id,
        slotIntervalMinutes: 30,
        timezone: organization.timezone,
        userId,
        workdayEndHour: settings.end,
        workdayStartHour: settings.start,
        workingDays: [...settings.days],
      },
    });
  }

  if (!seedDemoData) {
    console.log("Seeded empty Aptelys workspace. Set SEED_DEMO_DATA=true to include portfolio demo data.");
    return;
  }

  if (ownerId) {
    await prisma.calendarConnection.create({
      data: {
        accessToken: encryptSecret("demo-google-calendar-access-token"),
        calendarId: "primary",
        connectedEmail: "erik.santos.calendar@example.com",
        expiresAt: daysFromNow(10),
        organizationId: organization.id,
        provider: "google",
        refreshToken: encryptSecret("demo-google-calendar-refresh-token"),
        scope: "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
        tokenType: "Bearer",
        userId: ownerId,
      },
    });
  }

  const jobs = new Map<JobKey, string>();

  for (const jobSeed of jobSeeds) {
    const job = await prisma.job.create({
      data: {
        createdAt: daysAgo(jobSeed.createdDaysAgo),
        createdById: ownerId,
        currency: "USD",
        department: jobSeed.department,
        description: jobSeed.description,
        employmentType: jobSeed.employmentType,
        hiringManagerId: userIds.get(jobSeed.hiringManagerEmail),
        location: jobSeed.location,
        openings: jobSeed.openings,
        organizationId: organization.id,
        publishedAt: jobSeed.publishedDaysAgo ? daysAgo(jobSeed.publishedDaysAgo) : null,
        requirements: jobSeed.requirements,
        responsibilities: jobSeed.responsibilities,
        salaryMax: jobSeed.salaryMax,
        salaryMin: jobSeed.salaryMin,
        status: jobSeed.status,
        title: jobSeed.title,
        workMode: jobSeed.workMode,
      },
    });

    jobs.set(jobSeed.key, job.id);

    for (const stage of pipelineTemplate) {
      await prisma.pipelineStage.create({
        data: {
          category: stage.category,
          jobId: job.id,
          name: stage.name,
          organizationId: organization.id,
          position: stage.position,
        },
      });
    }
  }

  const stages = await prisma.pipelineStage.findMany({
    where: {
      organizationId: organization.id,
    },
  });
  const stageByJobCategory = new Map(stages.map((stage) => [`${stage.jobId}:${stage.category}`, stage.id]));
  const candidates = new Map<string, string>();
  const applications = new Map<string, string>();

  for (const candidateSeed of candidateSeeds) {
    const candidate = await prisma.candidate.create({
      data: {
        availability: candidateSeed.availability,
        createdAt: daysAgo(Math.max(...candidateSeed.applications.map((application) => application.appliedDaysAgo)) + 2),
        currency: "USD",
        currentTitle: candidateSeed.currentTitle,
        education: {
          create: candidateSeed.education,
        },
        email: candidateSeed.email,
        experience: {
          create: candidateSeed.experience.map((experience) => {
            const current = "current" in experience ? Boolean(experience.current) : false;
            const yearsAgoEnd = "yearsAgoEnd" in experience ? experience.yearsAgoEnd : null;

            return {
              company: experience.company,
              current,
              description: experience.description,
              endDate: yearsAgoEnd ? daysAgo(yearsAgoEnd * 365) : null,
              location: candidateSeed.location,
              startDate: daysAgo(experience.yearsAgoStart * 365),
              title: experience.title,
            };
          }),
        },
        location: candidateSeed.location,
        name: candidateSeed.name,
        organizationId: organization.id,
        phone: candidateSeed.phone,
        resumes: {
          create: {
            createdAt: daysAgo(Math.max(...candidateSeed.applications.map((application) => application.appliedDaysAgo))),
            fileKey:
              candidateSeed.resumeStatus === ParserStatus.FAILED
                ? null
                : `local:organizations/${organization.id}/demo/${slugify(candidateSeed.name)}.pdf`,
            fileName: `${slugify(candidateSeed.name)}-resume.pdf`,
            mimeType: "application/pdf",
            organizationId: organization.id,
            parsedAt: candidateSeed.resumeStatus === ParserStatus.FAILED ? null : daysAgo(1),
            parsedData: buildParsedResumeData(candidateSeed),
            parserStatus: candidateSeed.resumeStatus,
            rawText: buildResumeText(candidateSeed),
            reviewedAt: candidateSeed.resumeReviewed ? daysAgo(1) : null,
            reviewedById: candidateSeed.resumeReviewed ? recruiterId : null,
            sizeBytes: candidateSeed.resumeStatus === ParserStatus.FAILED ? 185_000 : 328_000,
          },
        },
        salaryExpectation: candidateSeed.salaryExpectation,
        source: candidateSeed.source,
        summary: candidateSeed.summary,
        yearsExperience: candidateSeed.yearsExperience,
      },
    });

    candidates.set(candidateSeed.email, candidate.id);

    for (const [index, skillName] of candidateSeed.skills.entries()) {
      const skill = await prisma.skill.upsert({
        where: {
          organizationId_name: {
            name: skillName,
            organizationId: organization.id,
          },
        },
        update: {},
        create: {
          name: skillName,
          organizationId: organization.id,
        },
      });

      await prisma.candidateSkill.create({
        data: {
          candidateId: candidate.id,
          confidence: Math.max(78, 96 - index * 3),
          organizationId: organization.id,
          skillId: skill.id,
        },
      });
    }

    for (const applicationSeed of candidateSeed.applications) {
      const jobId = jobs.get(applicationSeed.job);

      if (!jobId) {
        continue;
      }

      const hiredDaysAgo = "hiredDaysAgo" in applicationSeed ? applicationSeed.hiredDaysAgo : null;
      const publicToken = "publicToken" in applicationSeed ? applicationSeed.publicToken : null;
      const rejectedDaysAgo = "rejectedDaysAgo" in applicationSeed ? applicationSeed.rejectedDaysAgo : null;
      const notes = "notes" in applicationSeed && applicationSeed.notes ? applicationSeed.notes : [];

      const application = await prisma.application.create({
        data: {
          appliedAt: daysAgo(applicationSeed.appliedDaysAgo),
          candidateId: candidate.id,
          hiredAt: hiredDaysAgo ? daysAgo(hiredDaysAgo) : null,
          jobId,
          matchExplanation: buildMatchExplanation({
            gaps: applicationSeed.gaps,
            matchedSkills: candidateSeed.skills.slice(0, 5),
            missingSkills: applicationSeed.gaps.slice(0, 2),
            notes: applicationSeed.notes,
            score: applicationSeed.score,
            strengths: applicationSeed.strengths,
          }),
          matchScore: applicationSeed.score,
          organizationId: organization.id,
          pipelinePosition: applicationSeed.position,
          publicToken,
          rejectedAt: rejectedDaysAgo ? daysAgo(rejectedDaysAgo) : null,
          source: candidateSeed.source,
          stageEnteredAt: daysAgo(applicationSeed.stageEnteredDaysAgo),
          stageId: stageByJobCategory.get(`${jobId}:${applicationSeed.category}`),
          status: applicationSeed.status,
        },
      });

      applications.set(`${candidateSeed.email}:${applicationSeed.job}`, application.id);

      for (const note of notes) {
        await prisma.candidateNote.create({
          data: {
            applicationId: application.id,
            authorId: recruiterId,
            body: note,
            candidateId: candidate.id,
            organizationId: organization.id,
            visibility: NoteVisibility.TEAM,
          },
        });
      }
    }
  }

  const templateSeeds = [
    {
      key: "received",
      name: "Application received",
      subject: "We received your application for {{jobTitle}}",
      body: "Hi {{candidateName}}, thanks for applying to {{jobTitle}}. We received your resume and our team will review your profile soon.",
      trigger: EmailTrigger.APPLICATION_RECEIVED,
    },
    {
      key: "screening",
      name: "Screening invite",
      subject: "Next step for {{jobTitle}}",
      body: "Hi {{candidateName}}, your profile looks aligned with {{jobTitle}}. Please choose a time for a recruiter screen.",
      trigger: EmailTrigger.MOVED_TO_STAGE,
    },
    {
      key: "interview",
      name: "Interview confirmation",
      subject: "Interview confirmed for {{jobTitle}}",
      body: "Hi {{candidateName}}, your interview is confirmed for {{interviewTime}}. We are looking forward to speaking with you.",
      trigger: EmailTrigger.INTERVIEW_SCHEDULED,
    },
    {
      key: "offer",
      name: "Offer follow-up",
      subject: "Following up on your {{jobTitle}} offer",
      body: "Hi {{candidateName}}, we are excited to discuss offer details and next steps with you.",
      trigger: EmailTrigger.OFFER_CREATED,
    },
    {
      key: "rejection",
      name: "Thoughtful rejection",
      subject: "Update on {{jobTitle}}",
      body: "Hi {{candidateName}}, thank you for your time in the {{jobTitle}} process. We will not be moving forward at this stage, but we appreciate your interest.",
      trigger: EmailTrigger.REJECTION_SENT,
    },
  ];
  const templates = new Map<string, string>();

  for (const templateSeed of templateSeeds) {
    const template = await prisma.emailTemplate.create({
      data: {
        active: true,
        body: templateSeed.body,
        name: templateSeed.name,
        organizationId: organization.id,
        subject: templateSeed.subject,
        trigger: templateSeed.trigger,
      },
    });

    templates.set(templateSeed.key, template.id);
  }

  for (const [jobKey, jobId] of jobs) {
    await prisma.automationRule.createMany({
      data: [
        {
          active: true,
          delayMinutes: 5,
          name: `${jobSeeds.find((job) => job.key === jobKey)?.title ?? "Role"} - screening invite`,
          organizationId: organization.id,
          stageId: stageByJobCategory.get(`${jobId}:${PipelineCategory.SCREENING}`),
          templateId: templates.get("screening"),
          trigger: AutomationTrigger.STAGE_CHANGED,
        },
        {
          active: true,
          delayMinutes: 0,
          name: `${jobSeeds.find((job) => job.key === jobKey)?.title ?? "Role"} - interview confirmation`,
          organizationId: organization.id,
          stageId: stageByJobCategory.get(`${jobId}:${PipelineCategory.INTERVIEW}`),
          templateId: templates.get("interview"),
          trigger: AutomationTrigger.INTERVIEW_SCHEDULED,
        },
      ],
    });
  }

  await prisma.automationRule.create({
    data: {
      active: true,
      delayMinutes: 0,
      name: "Send application received confirmation",
      organizationId: organization.id,
      templateId: templates.get("received"),
      trigger: AutomationTrigger.CANDIDATE_CREATED,
    },
  });

  const emailSeeds = [
    ["ana.martins@example.com", "fullstack", "interview", EmailStatus.DELIVERED, EmailTrigger.INTERVIEW_SCHEDULED, 5],
    ["bianca.costa@example.com", "aiProduct", "offer", EmailStatus.SENT, EmailTrigger.OFFER_CREATED, 2],
    ["mateus.rocha@example.com", "fullstack", "screening", EmailStatus.QUEUED, EmailTrigger.MOVED_TO_STAGE, 1],
    ["rafael.lima@example.com", "fullstack", "received", EmailStatus.QUEUED, EmailTrigger.APPLICATION_RECEIVED, 1],
    ["camila.nunes@example.com", "recruitingOps", "offer", EmailStatus.DELIVERED, EmailTrigger.OFFER_CREATED, 1],
    ["nina.park@example.com", "aiProduct", "interview", EmailStatus.FAILED, EmailTrigger.INTERVIEW_SCHEDULED, 3],
    ["lucas.almeida@example.com", "fullstack", "rejection", EmailStatus.BOUNCED, EmailTrigger.REJECTION_SENT, 7],
    ["livia@example.com", "recruitingOps", "screening", EmailStatus.SENT, EmailTrigger.MOVED_TO_STAGE, 1],
  ] as const;

  for (const [candidateEmail, jobKey, templateKey, status, trigger, days] of emailSeeds) {
    const candidateId = candidates.get(candidateEmail === "livia@example.com" ? "candidate.livia@example.com" : candidateEmail);
    const applicationId = applications.get(
      `${candidateEmail === "livia@example.com" ? "candidate.livia@example.com" : candidateEmail}:${jobKey}`,
    );
    const templateId = templates.get(templateKey);

    if (!candidateId || !applicationId || !templateId) {
      continue;
    }

    await prisma.emailMessage.create({
      data: {
        applicationId,
        body: `Hi, this is a demo ${templateKey} message for the ${jobSeeds.find((job) => job.key === jobKey)?.title} process.`,
        candidateId,
        createdAt: daysAgo(days),
        deliveredAt: status === EmailStatus.DELIVERED ? daysAgo(Math.max(0, days - 1)) : null,
        organizationId: organization.id,
        provider: status === EmailStatus.QUEUED ? "local-outbox" : "resend-demo",
        providerMessageId: status === EmailStatus.QUEUED ? null : `demo-${templateKey}-${slugify(candidateEmail)}`,
        senderId: recruiterId,
        sentAt: status === EmailStatus.QUEUED ? null : daysAgo(days),
        status,
        subject: `${templateSeeds.find((template) => template.key === templateKey)?.name ?? "Update"} - Aptelys demo`,
        templateId,
        toEmail: candidateEmail === "livia@example.com" ? "candidate.livia@example.com" : candidateEmail,
        trigger,
      },
    });
  }

  const interviewSeeds = [
    {
      candidateEmail: "ana.martins@example.com",
      job: "fullstack" as JobKey,
      title: "Technical architecture interview",
      type: InterviewType.TECHNICAL,
      status: InterviewStatus.SCHEDULED,
      startsAt: hoursFromNow(5),
      duration: 60,
      syncStatus: CalendarSyncStatus.SYNCED,
      organizerId: ownerId,
    },
    {
      candidateEmail: "bianca.costa@example.com",
      job: "aiProduct" as JobKey,
      title: "Offer alignment call",
      type: InterviewType.FINAL,
      status: InterviewStatus.SCHEDULED,
      startsAt: daysFromNow(2),
      duration: 45,
      syncStatus: CalendarSyncStatus.SYNCED,
      organizerId: ownerId,
    },
    {
      candidateEmail: "nina.park@example.com",
      job: "aiProduct" as JobKey,
      title: "AI ranking deep dive",
      type: InterviewType.TECHNICAL,
      status: InterviewStatus.SCHEDULED,
      startsAt: daysFromNow(3),
      duration: 60,
      syncStatus: CalendarSyncStatus.FAILED,
      syncError: "Demo sync failure: Google token requires reconnect.",
      organizerId: recruiterId,
    },
    {
      candidateEmail: "mateus.rocha@example.com",
      job: "fullstack" as JobKey,
      title: "Recruiter screen",
      type: InterviewType.PHONE_SCREEN,
      status: InterviewStatus.COMPLETED,
      startsAt: daysAgo(1),
      duration: 30,
      syncStatus: CalendarSyncStatus.NOT_SYNCED,
      organizerId: recruiterId,
    },
    {
      candidateEmail: "camila.nunes@example.com",
      job: "recruitingOps" as JobKey,
      title: "Hiring manager conversation",
      type: InterviewType.HIRING_MANAGER,
      status: InterviewStatus.SCHEDULED,
      startsAt: daysFromNow(1),
      duration: 45,
      syncStatus: CalendarSyncStatus.NOT_SYNCED,
      organizerId: adminId,
    },
  ];

  for (const interviewSeed of interviewSeeds) {
    const candidateId = candidates.get(interviewSeed.candidateEmail);
    const applicationId = applications.get(`${interviewSeed.candidateEmail}:${interviewSeed.job}`);
    const jobId = jobs.get(interviewSeed.job);

    if (!candidateId || !applicationId || !jobId) {
      continue;
    }

    await prisma.interview.create({
      data: {
        applicationId,
        calendarEventId:
          interviewSeed.syncStatus === CalendarSyncStatus.SYNCED ? `google-demo-${slugify(interviewSeed.title)}` : null,
        calendarEventUrl:
          interviewSeed.syncStatus === CalendarSyncStatus.SYNCED
            ? `https://calendar.google.com/calendar/event?eid=${slugify(interviewSeed.title)}`
            : null,
        calendarProvider: interviewSeed.syncStatus === CalendarSyncStatus.SYNCED ? "google" : null,
        calendarSyncError: interviewSeed.syncError ?? null,
        calendarSyncStatus: interviewSeed.syncStatus,
        calendarSyncedAt: interviewSeed.syncStatus === CalendarSyncStatus.SYNCED ? daysAgo(1) : null,
        candidateId,
        endsAt: addMinutes(interviewSeed.startsAt, interviewSeed.duration),
        jobId,
        meetingUrl: "https://meet.google.com/aptelys-demo",
        organizationId: organization.id,
        organizerId: interviewSeed.organizerId,
        startsAt: interviewSeed.startsAt,
        status: interviewSeed.status,
        timezone: organization.timezone,
        title: interviewSeed.title,
        type: interviewSeed.type,
      },
    });
  }

  const schedulingSeeds = [
    {
      candidateEmail: "mateus.rocha@example.com",
      job: "fullstack" as JobKey,
      title: "Choose your technical screen time",
      token: "demo-mateus-schedule",
      organizerId: recruiterId,
    },
    {
      candidateEmail: "rafael.lima@example.com",
      job: "fullstack" as JobKey,
      title: "Choose a recruiter review time",
      token: "demo-rafael-schedule",
      organizerId: recruiterId,
    },
  ];

  for (const schedulingSeed of schedulingSeeds) {
    const applicationId = applications.get(`${schedulingSeed.candidateEmail}:${schedulingSeed.job}`);

    if (!applicationId) {
      continue;
    }

    await prisma.schedulingLink.create({
      data: {
        active: true,
        applicationId,
        bufferAfterMinutes: 15,
        durationMinutes: 45,
        expiresAt: daysFromNow(8),
        maxDaysAhead: 12,
        meetingUrl: "https://meet.google.com/aptelys-demo",
        organizationId: organization.id,
        organizerId: schedulingSeed.organizerId,
        slotIntervalMinutes: 30,
        timezone: organization.timezone,
        title: schedulingSeed.title,
        token: schedulingSeed.token,
        type: InterviewType.TECHNICAL,
        workdayEndHour: 17,
        workdayStartHour: 9,
        workingDays: [1, 2, 3, 4, 5],
      },
    });
  }

  const auditSeeds = [
    {
      action: "application.public_submitted",
      candidateEmail: "rafael.lima@example.com",
      entityType: "application",
      job: "fullstack" as JobKey,
      metadata: { source: "careers_page", resumeStatus: "needs_review" },
    },
    {
      action: "pipeline.stage_changed",
      candidateEmail: "ana.martins@example.com",
      entityType: "application",
      job: "fullstack" as JobKey,
      metadata: { from: "Screening", to: "Interview", automationMessagesQueued: 1 },
    },
    {
      action: "email.delivery_failed",
      candidateEmail: "nina.park@example.com",
      entityType: "email_message",
      job: "aiProduct" as JobKey,
      metadata: { provider: "resend-demo", status: "FAILED" },
    },
    {
      action: "calendar.sync_failed",
      candidateEmail: "nina.park@example.com",
      entityType: "interview",
      job: "aiProduct" as JobKey,
      metadata: { provider: "google", reason: "token requires reconnect" },
    },
    {
      action: "application.hired",
      candidateEmail: "diego.herrera@example.com",
      entityType: "application",
      job: "fullstack" as JobKey,
      metadata: { timeToHireDays: 35 },
    },
  ];

  for (const auditSeed of auditSeeds) {
    const candidateId = candidates.get(auditSeed.candidateEmail);
    const applicationId = applications.get(`${auditSeed.candidateEmail}:${auditSeed.job}`);
    const jobId = jobs.get(auditSeed.job);

    await prisma.auditEvent.create({
      data: {
        action: auditSeed.action,
        actorId: auditSeed.action.includes("public") ? null : recruiterId,
        applicationId,
        candidateId,
        entityId: applicationId ?? candidateId ?? organization.id,
        entityType: auditSeed.entityType,
        jobId,
        metadata: auditSeed.metadata,
        organizationId: organization.id,
      },
    });
  }

  await prisma.auditEvent.create({
    data: {
      action: "seed.demo_workspace_refreshed",
      actorId: ownerId,
      entityId: organization.id,
      entityType: "organization",
      metadata: {
        activeJobs: 3,
        candidates: candidateSeeds.length,
        demoPassword,
        publicCareers: true,
        scenario: "portfolio-demo",
      },
      organizationId: organization.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
