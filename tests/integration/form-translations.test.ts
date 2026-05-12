import { describe, expect, test } from "vitest";
import {
  applySchemaTranslations,
  collectSchemaTranslationEntries,
  resolveFormSchema,
  resolveFormTitle,
} from "../../src/lib/form-translations";

describe("form translations", () => {
  test("resolves localized title and schema with fallback to German", () => {
    const form = {
      title: "Antrag",
      schema: {
        components: [
          { type: "textfield", key: "name", label: "Name" },
        ],
      },
      translations: {
        en: {
          title: "Request",
          schema: {
            components: [
              { type: "textfield", key: "name", label: "Name (EN)" },
            ],
          },
        },
      },
    };

    expect(resolveFormTitle(form, "de")).toBe("Antrag");
    expect(resolveFormTitle(form, "en")).toBe("Request");
    expect(resolveFormSchema(form, "en").components?.[0]?.label).toBe("Name (EN)");
  });

  test("collects and reapplies translatable schema strings", () => {
    const schema = {
      components: [
        {
          type: "select",
          key: "role",
          label: "Rolle",
          description: "Bitte waehlen",
          data: {
            values: [
              { label: "Leitung", value: "lead" },
              { label: "Team", value: "team" },
            ],
          },
        },
      ],
    };

    const entries = collectSchemaTranslationEntries(schema);
    expect(entries.map((entry) => entry.value)).toEqual(
      expect.arrayContaining(["Rolle", "Bitte waehlen", "Leitung", "Team"]),
    );

    const translated = applySchemaTranslations(schema, {
      "components.0.label": "Role",
      "components.0.description": "Please choose",
      "components.0.data.values.0.label": "Lead",
      "components.0.data.values.1.label": "Team",
    });

    expect(translated.components?.[0]?.label).toBe("Role");
    expect(
      ((translated.components?.[0] as { data?: { values?: Array<{ label?: string }> } }).data?.values?.[0]?.label),
    ).toBe("Lead");
  });
});
