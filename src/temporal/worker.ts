import { loadEnvFile } from "node:process";
import { NativeConnection, Worker } from "@temporalio/worker";
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

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: "formflow-approval",
    workflowsPath: require.resolve("./workflows/approvalWorkflow"),
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
