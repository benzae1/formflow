import { Parser } from "expr-eval";

export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
) {
  const parser = new Parser();
  const parsed = parser.parse(expression);
  return Boolean(parsed.evaluate(context as never));
}
