import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "@/lib/money";
import { UnknownNumeralError } from "@/lib/ai/guard";
import {
  allowedNumerals,
  RecordWordsError,
  writeRecordSentence,
} from "@/lib/ai/record-words";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: createMock } };
  },
}));

const facts = {
  count: 1,
  taken: money(2499),
  termCount: 6,
  acrossTerm: money(14994),
  stillToCome: money(12495),
};

function answer(sentence: string): unknown {
  return {
    choices: [
      {
        message: {
          tool_calls: [
            {
              type: "function",
              function: { name: "record_sentence", arguments: JSON.stringify({ sentence }) },
            },
          ],
        },
      },
    ],
  };
}

beforeEach(() => {
  createMock.mockReset();
  vi.stubEnv("AI_MODEL", "a-model");
  vi.stubEnv("AI_BASE_URL", "https://example.test/v1");
  vi.stubEnv("AI_API_KEY", "a-key");
  vi.stubEnv("AI_REASONING_EFFORT", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("allowedNumerals", () => {
  it("is every figure the server hands over, and nothing else", () => {
    expect(allowedNumerals(facts)).toEqual([1, 6, 24.99, 149.94, 124.95]);
  });
});

describe("writeRecordSentence", () => {
  it("returns a sentence that writes only the supplied figures", async () => {
    createMock.mockResolvedValueOnce(
      answer("PayPal has taken $24.99 so far, and $124.95 is still to come."),
    );

    await expect(writeRecordSentence(facts)).resolves.toBe(
      "PayPal has taken $24.99 so far, and $124.95 is still to come.",
    );
  });

  it("hands the model the figures, and asks it to calculate nothing", async () => {
    createMock.mockResolvedValueOnce(answer("PayPal has taken $24.99 of the $149.94."));

    await writeRecordSentence(facts);

    const request = createMock.mock.calls[0][0];
    const system = request.messages[0].content as string;
    const user = request.messages[1].content as string;

    expect(user).toContain("$24.99");
    expect(user).toContain("$149.94");
    expect(user).toContain("$124.95");
    expect(user).toContain("1");
    expect(user).toContain("6");
    expect(system).toMatch(/do not add/i);
    expect(system).toMatch(/only the numbers/i);
  });

  it("refuses an amount the model invented", async () => {
    createMock.mockResolvedValueOnce(answer("You have paid $99.00 so far."));

    await expect(writeRecordSentence(facts)).rejects.toThrow(UnknownNumeralError);
  });

  it("refuses a count the model wrote in words", async () => {
    createMock.mockResolvedValueOnce(answer("You have made five payments so far."));

    await expect(writeRecordSentence(facts)).rejects.toThrow(UnknownNumeralError);
  });

  it("refuses when the model returns no sentence", async () => {
    createMock.mockResolvedValueOnce(answer("   "));

    await expect(writeRecordSentence(facts)).rejects.toThrow(RecordWordsError);
  });

  it("refuses a sentence too long to be read in one go", async () => {
    createMock.mockResolvedValueOnce(answer(`PayPal has taken $24.99. ${"and ".repeat(80)}`));

    await expect(writeRecordSentence(facts)).rejects.toThrow(RecordWordsError);
  });
});
