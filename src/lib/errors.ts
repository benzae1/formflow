export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          status: error.status,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
        status: 500,
      },
    },
    { status: 500 },
  );
}
