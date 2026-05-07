import { Client, Connection } from "@temporalio/client";

export async function getTemporalClient() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  return new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
  });
}
