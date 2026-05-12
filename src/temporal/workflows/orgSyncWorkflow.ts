import { proxyActivities } from "@temporalio/workflow";

const { runScheduledOrgSync } = proxyActivities<{
  runScheduledOrgSync(): Promise<void>;
}>({
  startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3 },
});

export async function orgSyncWorkflow() {
  await runScheduledOrgSync();
}
