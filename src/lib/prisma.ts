import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma Client.");
}

function hasCurrentPrismaDelegates(client?: PrismaClient): client is PrismaClient {
  if (!client) {
    return false;
  }

  const delegates = client as PrismaClient & {
    authVerificationCode?: unknown;
    passwordResetToken?: unknown;
  };

  return Boolean(delegates.authVerificationCode && delegates.passwordResetToken);
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
  });
}

export const prisma = hasCurrentPrismaDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
