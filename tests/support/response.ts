export async function parseJson<T>(response: Response) {
  return (await response.json()) as T;
}
