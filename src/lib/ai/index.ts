/**
 * @file ai/index.ts
 * @description Central orchestration layer for AI-powered log interpretation.
 * 
 * CORE CONCEPT:
 * This component acts as the bridge between the Zag platform's data layer 
 * and external Large Language Models (LLMs). It transforms raw application 
 * logs into structured, actionable insights.
 * 
 * Responsibilities:
 * 1. Orchestration: Coordinates model selection (via `providers.ts`) and 
 *    prompt construction (via `prompts.ts`).
 * 2. Prompt Engineering: Applies specialized system prompts to ensure the 
 *    AI delivers precise, developer-focused explanations and solutions.
 * 3. Result Parsing: Uses robust regex and JSON parsing to convert the 
 *    AI's text output into a strictly typed schema (Explanation, Solution, Severity).
 * 4. Error Handling: Provides graceful fallbacks and user-friendly error 
 *    messages in case of API failures or malformed AI responses.
 * 
 * Workflow:
 * - Triggered by the `logWorker` during background task execution.
 */

import { generateText } from "ai";
import { getLanguageModel } from "./providers.js";
import { SYSTEM_PROMPTS, getLogExplainerUserPrompt } from "./prompts.js";



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
            console.error(" => [LIB ERROR: generateLogExplanation] JSON Parse Error:", parseError, "Original text:", text);
            return {
                explanation: text, // Fallback to raw text if parsing fails
                solution: null,
                severity: "medium"
            };
        }
    } catch (error: any) {
        console.error(" => [LIB ERROR: generateLogExplanation] AI Explanation Generation Error:", error);

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
