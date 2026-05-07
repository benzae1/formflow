import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

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
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      roles: ["admin", "submitter"],
    },
  });

  const approver = await db.user.upsert({
    where: { email: "approver@example.com" },
    update: {},
    create: {
      email: "approver@example.com",
      name: "Approver User",
      roles: ["approver", "submitter"],
    },
  });

  const submitter = await db.user.upsert({
    where: { email: "submitter@example.com" },
    update: {},
    create: {
      email: "submitter@example.com",
      name: "Submitter User",
      roles: ["submitter"],
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
