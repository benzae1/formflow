import { Parser } from "expr-eval";

const MAX_EXPRESSION_LENGTH = 500;

const ALLOWED_IDENTIFIER_PREFIXES = ["data.", "form.", "submitter."];

export function validateConditionExpression(expression: string): string | null {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return `Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters.`;
  }

  let parsed;
  try {
    parsed = new Parser().parse(expression);
  } catch (err) {
    return `Invalid expression: ${err instanceof Error ? err.message : String(err)}`;
  }

  const vars = parsed.variables({ withMembers: true });
  for (const v of vars) {
    const allowed = ALLOWED_IDENTIFIER_PREFIXES.some((prefix) => v.startsWith(prefix));
    if (!allowed) {
      return `Identifier "${v}" is not allowed. Use data.*, form.*, or submitter.* prefixes.`;
    }
  }

  return null;
}

export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
  fallback = false,
) {
  try {
    const parser = new Parser();
    const parsed = parser.parse(expression);
    return Boolean(parsed.evaluate(context as never));
  } catch {
    return fallback;
  }
}
