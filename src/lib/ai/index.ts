import { generateText } from "ai";
import { getLanguageModel, AIProvider } from "./providers.js";
import { SYSTEM_PROMPTS, getLogExplainerUserPrompt } from "./prompts.js";

interface GenerateExplanationParams {
    provider: AIProvider;
    modelName: string;
    apiKey: string;
    log: string;
    metadata?: Record<string, any>;
}

/**
 * Generates a structured JSON explanation for a given log using the specified AI model.
 * 
 * @param params - Configuration including provider, model details, API key, and the log content.
 * @returns An object containing explanation, solution, and severity.
 */
export const generateLogExplanation = async (params: GenerateExplanationParams) => {
    const { provider, modelName, apiKey, log, metadata } = params;

    try {
        const model = getLanguageModel(provider, modelName, apiKey);
        const userPrompt = getLogExplainerUserPrompt(log, metadata);

        const { text } = await generateText({
            model: model,
            system: SYSTEM_PROMPTS.LOG_EXPLAINER,
            prompt: userPrompt,
        });

        // Regex to extract JSON block from markdown if present, or just the JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;

        try {
            const parsed = JSON.parse(jsonString);
            return {
                explanation: parsed.explanation || "No explanation provided.",
                solution: parsed.solution || null,
                severity: parsed.severity || "low"
            };
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Original text:", text);
            return {
                explanation: text, // Fallback to raw text if parsing fails
                solution: null,
                severity: "medium"
            };
        }
    } catch (error: any) {
        console.error("AI Explanation Generation Error:", error);

        // Return a helpful error message for the UI if it's a known issue
        if (error.message?.includes("API key")) {
            return {
                explanation: "Failed to generate explanation: Invalid or missing API key.",
                solution: null,
                severity: "high"
            };
        }

        throw new Error(`Failed to generate AI explanation: ${error.message}`);
    }
};
