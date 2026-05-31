export type PipelineStage = {
  id: string;
  title: string;
  accent: string;
};

export type Candidate = {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  source: string;
  score: number;
  availability: string;
  salary: string;
  experience: string;
  education: string;
  summary: string;
  skills: string[];
  strengths: string[];
  risks: string[];
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: "Active" | "Draft" | "Paused";
  openings: number;
  candidates: number;
  avgScore: number;
  hiringManager: string;
};

export type Interview = {
  id: string;
  candidate: string;
  role: string;
  time: string;
  type: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  trigger: string;
  sent: number;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

export type DashboardRate = {
  label: string;
  value: number;
  color: string;
};

export type DashboardResumeParserMetric = {
  label: string;
  value: number;
  color: string;
};

export type DashboardAnalytics = {
  metrics: DashboardMetric[];
  rates: DashboardRate[];
  resumeParser: DashboardResumeParserMetric[];
};

export type DashboardData = {
  pipelineStages: PipelineStage[];
  candidates: Candidate[];
  initialPipeline: Record<string, string[]>;
  jobs: Job[];
  interviews: Interview[];
  emailTemplates: EmailTemplate[];
  analytics: DashboardAnalytics;
};
