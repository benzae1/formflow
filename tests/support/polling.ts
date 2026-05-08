export async function waitFor<T>(
  factory: () => Promise<T | null | undefined>,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    label?: string;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const intervalMs = options?.intervalMs ?? 250;
  const label = options?.label ?? "condition";
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await factory();

    if (result) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms.`);
}
