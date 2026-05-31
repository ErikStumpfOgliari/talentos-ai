import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CandidateSource,
  EmailTrigger,
  EmploymentType,
  InterviewType,
  JobStatus,
  MembershipRole,
  ParserStatus,
  PipelineCategory,
  PrismaClient,
  WorkMode,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/passwords";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const organizationSlug = "northstar-recruiting";
const demoPassword = "talentos-demo-2026";

const users = [
  {
    name: "Erik Santos",
    email: "erik@example.com",
    password: demoPassword,
    role: MembershipRole.OWNER,
  },
  {
    name: "Marina Lopes",
    email: "marina@example.com",
    password: demoPassword,
    role: MembershipRole.HIRING_MANAGER,
  },
  {
    name: "Theo Almeida",
    email: "theo@example.com",
    password: demoPassword,
    role: MembershipRole.RECRUITER,
  },
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
    salaryExpectation: 78000,
    summary:
      "Built multi-tenant SaaS platforms with React, Node.js, PostgreSQL, Redis queues, and OpenAI-assisted document workflows.",
    skills: ["React", "Next.js", "Node.js", "PostgreSQL", "OpenAI", "Redis"],
    education: {
      institution: "Universidade de Sao Paulo",
      degree: "B.S.",
      field: "Computer Science",
    },
    score: 94,
    stage: PipelineCategory.INTERVIEW,
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
    salaryExpectation: 70000,
    summary:
      "Designed API platforms, background workers, and search-heavy recruiting tools with strong reliability practices.",
    skills: ["NestJS", "Prisma", "PostgreSQL", "Docker", "AWS", "Queues"],
    education: {
      institution: "UTFPR",
      degree: "B.S.",
      field: "Software Engineering",
    },
    score: 88,
    stage: PipelineCategory.SCREENING,
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
    salaryExpectation: 82000,
    summary:
      "Delivered LLM-powered matching, extraction, and recommendation features for B2B workflow products.",
    skills: ["Python", "OpenAI", "Embeddings", "TypeScript", "Vector Search", "UX"],
    education: {
      institution: "Universidade Nova de Lisboa",
      degree: "M.S.",
      field: "Data Science",
    },
    score: 91,
    stage: PipelineCategory.OFFER,
  },
  {
    name: "Rafael Lima",
    email: "rafael.lima@example.com",
    phone: "+55 48 90000-0184",
    location: "Florianopolis, BR",
    source: CandidateSource.INDEED,
    currentTitle: "Frontend Engineer",
    yearsExperience: 5,
    availability: "3 weeks",
    salaryExpectation: 61000,
    summary:
      "Focused on dashboard UX, component systems, accessibility, and data-dense SaaS interfaces.",
    skills: ["React", "Tailwind", "Design Systems", "Accessibility", "Charts", "Testing"],
    education: {
      institution: "UFSC",
      degree: "B.S.",
      field: "Information Systems",
    },
    score: 79,
    stage: PipelineCategory.APPLIED,
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
    salaryExpectation: 66000,
    summary:
      "Implemented ATS processes, candidate communication workflows, and recruiter analytics for scaling teams.",
    skills: ["ATS Ops", "Analytics", "Automation", "Stakeholder Mgmt", "Process Design"],
    education: {
      institution: "PUC-Rio",
      degree: "B.A.",
      field: "Business Administration",
    },
    score: 84,
    stage: PipelineCategory.APPLIED,
  },
];

async function clearOrganizationData(organizationId: string) {
  await prisma.auditEvent.deleteMany({ where: { organizationId } });
  await prisma.emailMessage.deleteMany({ where: { organizationId } });
  await prisma.automationRule.deleteMany({ where: { organizationId } });
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
      name: "Northstar Recruiting",
      plan: "PRO",
      timezone: "America/Sao_Paulo",
    },
    create: {
      name: "Northstar Recruiting",
      slug: organizationSlug,
      plan: "PRO",
      timezone: "America/Sao_Paulo",
    },
  });

  await clearOrganizationData(organization.id);

  const createdUsers = new Map<string, string>();

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);

    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
      },
    });

    createdUsers.set(user.email, createdUser.id);

    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: createdUser.id,
        role: user.role,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
  }

  const ownerId = createdUsers.get("erik@example.com");
  const hiringManagerId = createdUsers.get("marina@example.com");
  const recruiterId = createdUsers.get("theo@example.com");

  const fullStackJob = await prisma.job.create({
    data: {
      organizationId: organization.id,
      createdById: ownerId,
      hiringManagerId,
      title: "Senior Full Stack Engineer",
      department: "Engineering",
      location: "Remote LATAM",
      workMode: WorkMode.REMOTE,
      employmentType: EmploymentType.FULL_TIME,
      status: JobStatus.ACTIVE,
      openings: 2,
      currency: "USD",
      salaryMin: 65000,
      salaryMax: 90000,
      description:
        "Own full-stack product delivery for an AI recruitment platform with React, Node.js, PostgreSQL, and AI workflows.",
      requirements: ["React", "Node.js", "PostgreSQL", "SaaS architecture", "OpenAI APIs"],
      responsibilities: ["Build product features", "Design APIs", "Own AI-assisted workflows"],
      publishedAt: new Date(),
    },
  });

  await prisma.job.createMany({
    data: [
      {
        organizationId: organization.id,
        createdById: ownerId,
        hiringManagerId: recruiterId,
        title: "AI Product Engineer",
        department: "AI Platform",
        location: "Hybrid Lisbon",
        workMode: WorkMode.HYBRID,
        employmentType: EmploymentType.FULL_TIME,
        status: JobStatus.ACTIVE,
        openings: 1,
        currency: "USD",
        salaryMin: 70000,
        salaryMax: 95000,
        description: "Build LLM-powered matching, extraction, ranking, and recruiter workflow features.",
        requirements: ["OpenAI", "Embeddings", "Product engineering", "TypeScript"],
        responsibilities: ["Prototype AI workflows", "Evaluate ranking quality", "Ship product UI"],
        publishedAt: new Date(),
      },
      {
        organizationId: organization.id,
        createdById: ownerId,
        hiringManagerId,
        title: "Backend Platform Engineer",
        department: "Engineering",
        location: "Remote Brazil",
        workMode: WorkMode.REMOTE,
        employmentType: EmploymentType.FULL_TIME,
        status: JobStatus.DRAFT,
        openings: 1,
        currency: "USD",
        salaryMin: 60000,
        salaryMax: 80000,
        description: "Design APIs, queues, database models, and integration infrastructure.",
        requirements: ["NestJS", "Prisma", "PostgreSQL", "Docker", "Queues"],
        responsibilities: ["Build APIs", "Own database performance", "Integrate background jobs"],
      },
    ],
  });

  const stages = await Promise.all(
    [
      { name: "Applied", category: PipelineCategory.APPLIED, position: 0 },
      { name: "Screening", category: PipelineCategory.SCREENING, position: 1 },
      { name: "Interview", category: PipelineCategory.INTERVIEW, position: 2 },
      { name: "Offer", category: PipelineCategory.OFFER, position: 3 },
    ].map((stage) =>
      prisma.pipelineStage.create({
        data: {
          organizationId: organization.id,
          jobId: fullStackJob.id,
          ...stage,
        },
      }),
    ),
  );

  const stageByCategory = new Map(stages.map((stage) => [stage.category, stage.id]));
  const applicationByCandidateEmail = new Map<string, string>();
  const candidateByEmail = new Map<string, string>();

  for (const candidateSeed of candidateSeeds) {
    const candidate = await prisma.candidate.create({
      data: {
        organizationId: organization.id,
        name: candidateSeed.name,
        email: candidateSeed.email,
        phone: candidateSeed.phone,
        location: candidateSeed.location,
        source: candidateSeed.source,
        currentTitle: candidateSeed.currentTitle,
        yearsExperience: candidateSeed.yearsExperience,
        availability: candidateSeed.availability,
        salaryExpectation: candidateSeed.salaryExpectation,
        currency: "USD",
        summary: candidateSeed.summary,
        education: {
          create: candidateSeed.education,
        },
        experience: {
          create: {
            company: "Previous SaaS Company",
            title: candidateSeed.currentTitle,
            location: candidateSeed.location,
            current: false,
            description: candidateSeed.summary,
          },
        },
        resumes: {
          create: {
            organizationId: organization.id,
            fileName: `${candidateSeed.name.toLowerCase().replaceAll(" ", "-")}.pdf`,
            fileKey: `demo/resumes/${candidateSeed.name.toLowerCase().replaceAll(" ", "-")}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: 240000,
            parserStatus: ParserStatus.PARSED,
            rawText: candidateSeed.summary,
            parsedData: {
              name: candidateSeed.name,
              email: candidateSeed.email,
              skills: candidateSeed.skills,
              experienceYears: candidateSeed.yearsExperience,
              education: candidateSeed.education,
            },
            parsedAt: new Date(),
          },
        },
      },
    });

    candidateByEmail.set(candidateSeed.email, candidate.id);

    for (const skillName of candidateSeed.skills) {
      const skill = await prisma.skill.upsert({
        where: {
          organizationId_name: {
            organizationId: organization.id,
            name: skillName,
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          name: skillName,
        },
      });

      await prisma.candidateSkill.create({
        data: {
          organizationId: organization.id,
          candidateId: candidate.id,
          skillId: skill.id,
          confidence: 92,
        },
      });
    }

    const application = await prisma.application.create({
      data: {
        organizationId: organization.id,
        jobId: fullStackJob.id,
        candidateId: candidate.id,
        stageId: stageByCategory.get(candidateSeed.stage),
        source: candidateSeed.source,
        matchScore: candidateSeed.score,
        matchExplanation: {
          strengths: ["Relevant SaaS experience", "Strong technical overlap", "Good availability"],
          gaps: candidateSeed.score < 85 ? ["Needs deeper technical validation"] : [],
        },
      },
    });

    applicationByCandidateEmail.set(candidateSeed.email, application.id);
  }

  const templates = await Promise.all(
    [
      {
        name: "Screening invite",
        subject: "Next step for {{jobTitle}}",
        body: "Hi {{candidateName}}, we would like to schedule a screening conversation.",
        trigger: EmailTrigger.MOVED_TO_STAGE,
      },
      {
        name: "Interview confirmation",
        subject: "Interview confirmed for {{jobTitle}}",
        body: "Hi {{candidateName}}, your interview is confirmed for {{interviewTime}}.",
        trigger: EmailTrigger.INTERVIEW_SCHEDULED,
      },
      {
        name: "Offer follow-up",
        subject: "Following up on your offer",
        body: "Hi {{candidateName}}, we are excited to discuss the offer details with you.",
        trigger: EmailTrigger.OFFER_CREATED,
      },
      {
        name: "Rejection update",
        subject: "Update on {{jobTitle}}",
        body: "Hi {{candidateName}}, thank you for your time in the {{jobTitle}} process. We will not be moving forward at this stage, but we appreciate your interest.",
        trigger: EmailTrigger.REJECTION_SENT,
      },
    ].map((template) =>
      prisma.emailTemplate.create({
        data: {
          organizationId: organization.id,
          ...template,
        },
      }),
    ),
  );

  await prisma.automationRule.createMany({
    data: [
      {
        organizationId: organization.id,
        name: "Send screening invite",
        trigger: "STAGE_CHANGED",
        stageId: stageByCategory.get(PipelineCategory.SCREENING),
        templateId: templates[0].id,
        active: true,
        delayMinutes: 10,
      },
      {
        organizationId: organization.id,
        name: "Send interview confirmation",
        trigger: "INTERVIEW_SCHEDULED",
        templateId: templates[1].id,
        active: true,
        delayMinutes: 0,
      },
    ],
  });

  const interviewSeeds = [
    {
      email: "ana.martins@example.com",
      title: "Technical screen",
      type: InterviewType.TECHNICAL,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 7),
    },
    {
      email: "bianca.costa@example.com",
      title: "Hiring manager",
      type: InterviewType.HIRING_MANAGER,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 28),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 29),
    },
    {
      email: "mateus.rocha@example.com",
      title: "System design",
      type: InterviewType.TECHNICAL,
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 52),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 53),
    },
  ];

  for (const interview of interviewSeeds) {
    const candidateId = candidateByEmail.get(interview.email);
    const applicationId = applicationByCandidateEmail.get(interview.email);

    if (!candidateId || !applicationId) {
      continue;
    }

    await prisma.interview.create({
      data: {
        organizationId: organization.id,
        applicationId,
        candidateId,
        jobId: fullStackJob.id,
        organizerId: recruiterId,
        title: interview.title,
        type: interview.type,
        startsAt: interview.startsAt,
        endsAt: interview.endsAt,
        meetingUrl: "https://meet.google.com/demo-room",
      },
    });
  }

  for (const [index, candidateSeed] of candidateSeeds.entries()) {
    await prisma.emailMessage.create({
      data: {
        organizationId: organization.id,
        candidateId: candidateByEmail.get(candidateSeed.email),
        applicationId: applicationByCandidateEmail.get(candidateSeed.email),
        templateId: templates[index % templates.length].id,
        senderId: recruiterId,
        toEmail: candidateSeed.email,
        subject: `Next step for ${fullStackJob.title}`,
        body: `Hi ${candidateSeed.name}, thank you for your interest in ${fullStackJob.title}.`,
        status: "SENT",
        trigger: EmailTrigger.MOVED_TO_STAGE,
        provider: "resend-demo",
        providerMessageId: `demo-${index + 1}`,
        sentAt: new Date(),
      },
    });
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: ownerId,
      action: "seed.created",
      entityType: "organization",
      entityId: organization.id,
      metadata: {
        candidates: candidateSeeds.length,
        jobs: 3,
      },
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
