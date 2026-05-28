// Use environment variables provided by the container at runtime.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_USERS !== "true") {
  throw new Error(
    "Refusing to seed demo users in production. Set ALLOW_DEMO_USERS=true only for intentional production seeding.",
  );
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SYSTEM_ROLES = [
  { name: "admin", label: "Administrator" },
  { name: "approver", label: "Approver" },
  { name: "compliance", label: "Compliance" },
  { name: "submitter", label: "Submitter" },
] as const;

function connectRoles(names: string[]) {
  return {
    set: [],
    connect: names.map((name) => ({ name })),
  };
}

async function main() {
  for (const role of SYSTEM_ROLES) {
    await db.role.upsert({
      where: { name: role.name },
      update: { label: role.label },
      create: role,
    });
  }

  const admin = await db.user.upsert({
    where: { email: "admin@bauhaus.de" },
    update: {
      name: "Admin User",
      externalId: "admin",
      passwordHash: await hash("admin", 10),
      deactivatedAt: null,
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
      roles: connectRoles(["admin", "submitter"]),
    },
    create: {
      email: "admin@bauhaus.de",
      name: "Admin User",
      externalId: "admin",
      roles: {
        connect: [{ name: "admin" }, { name: "submitter" }],
      },
      passwordHash: await hash("admin", 10),
    },
  });

  const approver = await db.user.upsert({
    where: { email: "approver@bauhaus.de" },
    update: {
      name: "Approver User",
      externalId: "approver",
      passwordHash: await hash("approver", 10),
      deactivatedAt: null,
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
      roles: connectRoles(["approver", "submitter"]),
    },
    create: {
      email: "approver@bauhaus.de",
      name: "Approver User",
      externalId: "approver",
      roles: {
        connect: [{ name: "approver" }, { name: "submitter" }],
      },
      passwordHash: await hash("approver", 10),
    },
  });

  const submitter = await db.user.upsert({
    where: { email: "submitter@bauhaus.de" },
    update: {
      name: "Submitter User",
      externalId: "submitter",
      passwordHash: await hash("submitter", 10),
      deactivatedAt: null,
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
      roles: connectRoles(["submitter"]),
    },
    create: {
      email: "submitter@bauhaus.de",
      name: "Submitter User",
      externalId: "submitter",
      roles: {
        connect: [{ name: "submitter" }],
      },
      passwordHash: await hash("submitter", 10),
    },
  });

  const existingWorkflow = await db.workflow.findFirst({
    where: { name: "Basic approval" },
  });

  const basicApprovalWorkflow = {
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
  };

  if (existingWorkflow) {
    await db.workflow.update({
      where: { id: existingWorkflow.id },
      data: basicApprovalWorkflow,
    });
  } else {
    await db.workflow.create({
      data: basicApprovalWorkflow,
    });
  }

  console.log({ admin, approver, submitter });
}

main().finally(async () => {
  await db.$disconnect();
});
