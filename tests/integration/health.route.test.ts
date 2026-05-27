import { beforeEach, describe, expect, test, vi } from "vitest";

const { queryRawMock, countMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: queryRawMock,
  },
}));

vi.mock("@/lib/temporal", () => ({
  getTemporalClient: async () => ({
    workflow: {
      count: countMock,
    },
  }),
}));

import { GET } from "../../src/app/api/health/route";

describe("health route", () => {
  beforeEach(() => {
    countMock.mockReset();
    queryRawMock.mockReset();
  });

  test("returns ok when database and temporal are reachable", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    countMock.mockResolvedValue({ count: 0 });

    const response = await GET();
    const payload = (await response.json()) as {
      ok: boolean;
      checks: {
        database: { ok: boolean };
        temporal: { ok: boolean };
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.checks.database.ok).toBe(true);
    expect(payload.checks.temporal.ok).toBe(true);
  });

  test("returns 503 when temporal is unavailable", async () => {
    queryRawMock.mockResolvedValue([{ "?column?": 1 }]);
    countMock.mockRejectedValue(new Error("Temporal unavailable"));

    const response = await GET();
    const payload = (await response.json()) as {
      ok: boolean;
      checks: {
        temporal: { ok: boolean };
      };
    };

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.checks.temporal.ok).toBe(false);
  });
});
