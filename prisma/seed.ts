import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

try {
  loadEnvFile();
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const admin = await db.user.upsert({
    where: { email: "admin@bauhaus.de" },
    update: { passwordHash: await hash("admin", 10) },
    create: {
      email: "admin@bauhaus.de",
      name: "Admin User",
      externalId: "admin",
      roles: ["admin", "submitter"],
      passwordHash: await hash("admin", 10),
    },
  });

  const approver = await db.user.upsert({
    where: { email: "approver@bauhaus.de" },
    update: { passwordHash: await hash("approver", 10) },
    create: {
      email: "approver@bauhaus.de",
      name: "Approver User",
      externalId: "approver",
      roles: ["approver", "submitter"],
      passwordHash: await hash("approver", 10),
    },
  });

  const submitter = await db.user.upsert({
    where: { email: "submitter@bauhaus.de" },
    update: { passwordHash: await hash("submitter", 10) },
    create: {
      email: "submitter@bauhaus.de",
      name: "Submitter User",
      externalId: "submitter",
      roles: ["submitter"],
      passwordHash: await hash("submitter", 10),
    },
  });

  const existingWorkflow = await db.workflow.findFirst({
    where: { name: "Basic approval" },
  });

  if (!existingWorkflow) {
    await db.workflow.create({
      data: {
        name: "Basic approval",
        createdById: admin.id,
        definition: [
          {
            id: "approval",
            name: "Approval",
            type: "approval",
            assignTo: {
              type: "user",
              value: approver.id,
            },
            onApprove: "close",
            onReject: "close",
          },
        ],
      },
    });
  }

  console.log({ admin, approver, submitter });
}

main().finally(async () => {
  await db.$disconnect();
});
