/**
 * @file ai.test.ts
 * @description Comprehensive unit and integration tests for the AI Interpretation Engine.
 * 
 * CORE CONCEPT:
 * These tests validate the platform's ability to orchestrate LLM calls and parse 
 * their results.
 */

import { generateLogExplanation } from "../../lib/ai/index.js";
import { generateText } from "ai";

describe("AI Interpretation Engine", () => {
    const mockParams: any = {
        provider: "google",
        modelName: "gemini-flash-latest",
        apiKey: "dummy-key",
        log: "Error: connect ECONNREFUSED 127.0.0.1:5432",
        metadata: { project: "web-api" }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * TEST: Seamless Parsing
     * Validates that the engine correctly extracts JSON even if the LLM 
     * returns it wrapped in Markdown code blocks.
     */
    it("should correctly parse structured JSON wrapped in markdown", async () => {
        const mockApiResponse = {
            text: "Here is the analysis:\n```json\n{\n  \"explanation\": \"Database connection failed.\",\n  \"solution\": \"Check if Postgres is running.\",\n  \"severity\": \"high\"\n}\n```"
        };

        // Use the globally defined mock
        vi.mocked(generateText).mockResolvedValue(mockApiResponse as any);

        const result = await generateLogExplanation(mockParams);

        expect(result.explanation).toBe("Database connection failed.");
        expect(result.solution).toBe("Check if Postgres is running.");
        expect(result.severity).toBe("high");
    });

    /**
     * TEST: Graceful Fallback
     * Verifies that if the AI fails to follow the JSON constraint, 
     * we return the raw text as the explanation instead of crashing.
     */
    it("should return raw text as explanation if JSON parsing fails", async () => {
        const mockApiResponse = {
            text: "This is a simple text explanation without JSON."
        };

        vi.mocked(generateText).mockResolvedValue(mockApiResponse as any);

        const result = await generateLogExplanation(mockParams);

        expect(result.explanation).toBe(mockApiResponse.text);
        expect(result.severity).toBe("medium");
    });

    /**
     * TEST: Error Handling
     */
    it("should catch and format API key errors specifically", async () => {
        vi.mocked(generateText).mockRejectedValue(new Error("Invalid API key provided."));

        const result = await generateLogExplanation(mockParams);

        expect(result.explanation).toContain("Invalid or missing API key");
        expect(result.severity).toBe("high");
    });

    /**
     * TEST: Prompt Construction
     */
    it("should pass the correct prompt structure to the AI SDK", async () => {
        vi.mocked(generateText).mockResolvedValue({ text: "{}" } as any);

        await generateLogExplanation(mockParams);

        expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
            system: expect.any(String),
            prompt: expect.stringContaining(mockParams.log)
        }));
    });
});
