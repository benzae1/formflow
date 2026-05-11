type TemporalModule = typeof import("@temporalio/client");
type TemporalClient = InstanceType<TemporalModule["Client"]>;

const globalForTemporal = globalThis as typeof globalThis & {
  temporalClient?: Promise<TemporalClient>;
};

export function getTemporalClient() {
  if (!globalForTemporal.temporalClient) {
    globalForTemporal.temporalClient = createTemporalClient();
  }

  return globalForTemporal.temporalClient;
}

async function createTemporalClient() {
  const { Client, Connection } = await import("@temporalio/client");

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  return new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
  });
}
