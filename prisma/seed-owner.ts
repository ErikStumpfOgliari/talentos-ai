import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { MembershipRole, MembershipStatus, PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/passwords";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the owner seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const organizationSlug = process.env.DEFAULT_ORGANIZATION_SLUG ?? "northstar-recruiting";
const ownerEmail = (process.env.OWNER_EMAIL ?? "erik@example.com").toLowerCase();
const ownerName = process.env.OWNER_NAME ?? "Erik Santos";
const ownerPassword = process.env.OWNER_PASSWORD ?? "aptelys-demo-2026";

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!organization) {
    throw new Error(
      `Organization with slug "${organizationSlug}" was not found. Run "npx prisma db seed" first to create the empty workspace.`,
    );
  }

  const passwordHash = await hashPassword(ownerPassword);

  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: ownerName,
      passwordHash,
    },
    create: {
      email: ownerEmail,
      name: ownerName,
      passwordHash,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });

  console.log(`Owner ready: ${user.email} (${MembershipRole.OWNER}) in "${organization.name}" [${organization.slug}]`);
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
