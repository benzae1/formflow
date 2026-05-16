import { buildCsrfCookie, createCsrfToken } from "@/lib/csrf";

export async function GET() {
  const csrfToken = createCsrfToken();

  return Response.json(
    { csrfToken },
    {
      headers: {
        "Set-Cookie": buildCsrfCookie(csrfToken),
      },
    },
  );
}
