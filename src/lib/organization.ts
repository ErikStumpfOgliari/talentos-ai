import { prisma } from "@/lib/prisma";

export const defaultOrganizationSlug = process.env.DEFAULT_ORGANIZATION_SLUG ?? "northstar-recruiting";

export async function getDefaultOrganization() {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
  });

  if (!organization) {
    throw new Error(`Organization "${defaultOrganizationSlug}" was not found.`);
  }

  return organization;
}
