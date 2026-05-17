import { loadEnvFile } from "node:process";
import { NativeConnection, Worker } from "@temporalio/worker";
import { Client, Connection, ScheduleAlreadyRunning, ScheduleOverlapPolicy } from "@temporalio/client";
import * as approvalActivities from "./activities/approvalActivities";
import * as notificationActivities from "./activities/notificationActivities";
import * as orgActivities from "./activities/orgActivities";
import { logger } from "@/lib/logger";

try {
  loadEnvFile();
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

const SCHEDULE_ID = "org-sync-scheduled";
const ORG_SYNC_INTERVAL_MINUTES = parseInt(
  process.env.ORG_SYNC_INTERVAL_MINUTES ?? "60",
  10,
);

async function ensureOrgSyncSchedule(client: Client) {
  const intervalSeconds = ORG_SYNC_INTERVAL_MINUTES * 60;

  try {
    await client.schedule.create({
      scheduleId: SCHEDULE_ID,
      spec: {
        intervals: [{ every: `${intervalSeconds}s` }],
      },
      action: {
        type: "startWorkflow",
        workflowType: "orgSyncWorkflow",
        taskQueue: "formflow-approval",
      },
      policies: {
        overlap: ScheduleOverlapPolicy.SKIP,
      },
    });
    logger.info({ intervalMinutes: ORG_SYNC_INTERVAL_MINUTES }, "Org sync schedule created");
  } catch (err) {
    if (err instanceof ScheduleAlreadyRunning) {
      logger.info("Org sync schedule already exists");
    } else {
      throw err;
    }
  }
}

async function run() {
  const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";

  const nativeConnection = await NativeConnection.connect({ address });
  const clientConnection = await Connection.connect({ address });
  const client = new Client({ connection: clientConnection, namespace });

  await ensureOrgSyncSchedule(client);

  const worker = await Worker.create({
    connection: nativeConnection,
    namespace,
    taskQueue: "formflow-approval",
    workflowsPath: require.resolve("./workflows"),
    activities: {
      ...approvalActivities,
      ...notificationActivities,
      ...orgActivities,
    },
  });

  await worker.run();
}

run().catch((err) => {
  logger.error({ err }, "Temporal worker crashed");
  process.exit(1);
});
