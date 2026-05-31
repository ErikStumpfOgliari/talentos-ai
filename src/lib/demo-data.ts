import type { Candidate, EmailTemplate, Interview, Job, PipelineStage } from "./types";

export const pipelineStages: PipelineStage[] = [
  { id: "applied", title: "Applied", accent: "bg-sky-500" },
  { id: "screening", title: "Screening", accent: "bg-amber-500" },
  { id: "interview", title: "Interview", accent: "bg-violet-500" },
  { id: "offer", title: "Offer", accent: "bg-emerald-500" },
];

export const candidates: Candidate[] = [
  {
    id: "ana",
    name: "Ana Martins",
    role: "Senior Full Stack Engineer",
    location: "Sao Paulo, BR",
    email: "ana.martins@example.com",
    phone: "+55 11 90000-0101",
    source: "LinkedIn",
    score: 94,
    availability: "2 weeks",
    salary: "$78k",
    experience: "8 years",
    education: "B.S. Computer Science",
    summary:
      "Built multi-tenant SaaS platforms with React, Node.js, PostgreSQL, Redis queues, and OpenAI-assisted document workflows.",
    skills: ["React", "Next.js", "Node.js", "PostgreSQL", "OpenAI", "Redis"],
    strengths: ["Strong SaaS architecture", "AI workflow experience", "Owns delivery end to end"],
    risks: ["Requires remote-first team"],
  },
  {
    id: "mateus",
    name: "Mateus Rocha",
    role: "Backend Platform Engineer",
    location: "Curitiba, BR",
    email: "mateus.rocha@example.com",
    phone: "+55 41 90000-0112",
    source: "Referral",
    score: 88,
    availability: "Immediate",
    salary: "$70k",
    experience: "6 years",
    education: "Software Engineering",
    summary:
      "Designed API platforms, background workers, and search-heavy recruiting tools with strong reliability practices.",
    skills: ["NestJS", "Prisma", "PostgreSQL", "Docker", "AWS", "Queues"],
    strengths: ["Excellent API design", "Production operations", "Clear documentation"],
    risks: ["Less frontend depth"],
  },
  {
    id: "bianca",
    name: "Bianca Costa",
    role: "AI Product Engineer",
    location: "Lisbon, PT",
    email: "bianca.costa@example.com",
    phone: "+351 900 000 120",
    source: "Inbound",
    score: 91,
    availability: "30 days",
    salary: "$82k",
    experience: "7 years",
    education: "M.S. Data Science",
    summary:
      "Delivered LLM-powered matching, extraction, and recommendation features for B2B workflow products.",
    skills: ["Python", "OpenAI", "Embeddings", "TypeScript", "Vector Search", "UX"],
    strengths: ["Very strong AI product judgment", "Explains ranking well", "Comfortable with ambiguity"],
    risks: ["Needs backend support for infra-heavy work"],
  },
  {
    id: "rafael",
    name: "Rafael Lima",
    role: "Frontend Engineer",
    location: "Florianopolis, BR",
    email: "rafael.lima@example.com",
    phone: "+55 48 90000-0184",
    source: "Indeed",
    score: 79,
    availability: "3 weeks",
    salary: "$61k",
    experience: "5 years",
    education: "Information Systems",
    summary:
      "Focused on dashboard UX, component systems, accessibility, and data-dense SaaS interfaces.",
    skills: ["React", "Tailwind", "Design Systems", "Accessibility", "Charts", "Testing"],
    strengths: ["Excellent UI execution", "Good accessibility instincts", "Fast prototyper"],
    risks: ["Limited backend ownership"],
  },
  {
    id: "camila",
    name: "Camila Nunes",
    role: "Recruiting Operations Lead",
    location: "Rio de Janeiro, BR",
    email: "camila.nunes@example.com",
    phone: "+55 21 90000-0144",
    source: "Talent Pool",
    score: 84,
    availability: "45 days",
    salary: "$66k",
    experience: "9 years",
    education: "Business Administration",
    summary:
      "Implemented ATS processes, candidate communication workflows, and recruiter analytics for scaling teams.",
    skills: ["ATS Ops", "Analytics", "Automation", "Stakeholder Mgmt", "Process Design"],
    strengths: ["Deep recruiting domain knowledge", "Great process discipline", "Strong communication"],
    risks: ["Not an engineering candidate"],
  },
];

export const initialPipeline: Record<string, string[]> = {
  applied: ["rafael", "camila"],
  screening: ["mateus"],
  interview: ["ana"],
  offer: ["bianca"],
};

export const jobs: Job[] = [
  {
    id: "fullstack",
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    location: "Remote LATAM",
    status: "Active",
    openings: 2,
    candidates: 48,
    avgScore: 86,
    hiringManager: "Marina Lopes",
  },
  {
    id: "ai-product",
    title: "AI Product Engineer",
    department: "AI Platform",
    location: "Hybrid Lisbon",
    status: "Active",
    openings: 1,
    candidates: 31,
    avgScore: 82,
    hiringManager: "Theo Almeida",
  },
  {
    id: "backend",
    title: "Backend Platform Engineer",
    department: "Engineering",
    location: "Remote Brazil",
    status: "Draft",
    openings: 1,
    candidates: 14,
    avgScore: 78,
    hiringManager: "Livia Pereira",
  },
];

export const interviews: Interview[] = [
  {
    id: "int-1",
    candidate: "Ana Martins",
    role: "Senior Full Stack Engineer",
    time: "Today, 14:30",
    type: "Technical screen",
  },
  {
    id: "int-2",
    candidate: "Bianca Costa",
    role: "AI Product Engineer",
    time: "Tomorrow, 10:00",
    type: "Hiring manager",
  },
  {
    id: "int-3",
    candidate: "Mateus Rocha",
    role: "Backend Platform Engineer",
    time: "Fri, 16:00",
    type: "System design",
  },
];

export const emailTemplates: EmailTemplate[] = [
  { id: "screen", name: "Screening invite", trigger: "Moved to Screening", sent: 126 },
  { id: "interview", name: "Interview confirmation", trigger: "Interview scheduled", sent: 84 },
  { id: "offer", name: "Offer follow-up", trigger: "Moved to Offer", sent: 18 },
];
