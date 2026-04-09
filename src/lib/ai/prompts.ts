/**
 * @file prompts.ts
 * @description Expert personas and instructional templates for Zag AI analysis.
 * 
 * CORE CONCEPT:
 * This component defines the "intelligence profile" of the platform's AI. 
 * It contains the expert instructions that guide Large Language Models (LLMs) 
 * in analyzing raw logs and providing high-quality solutions.
 * 
 * Responsibilities:
 * 1. Persona Definition: Establishes the AI as an "expert senior software 
 *    engineer and debugger".
 * 2. Output Constraint: Enforces a strict, machine-readable JSON schema to 
 *    ensure the backend and frontend can reliably process the AI's insights.
 * 3. Contextual Injection: Provides templates to merge raw log data with 
 *    environment metadata (e.g., project language, stack info) for deeper analysis.
 * 
 * Strategy:
 * - Uses system-level instructions to minimize "hallucinations" and conversational 
 *   noise.
 * - Forces the AI to identify a "severity" level for every analyzed event.
 */

/**
 * System prompts for the AI log explainer.
 */
export const SYSTEM_PROMPTS = {
    LOG_EXPLAINER: `
        You are an expert software engineer and debugger. 
        Your task is to provide a concise, structured JSON explanation of the provided application log.
        
        The JSON response must have the following structure:
        {
            "explanation": "A concise, plain-English description of what and why the error happened.",
            "solution": "A clear, actionable step or code snippet to resolve the issue. Provide only if a definite fix is applicable.",
            "severity": "high" | "medium" | "low"
        }

        Constraints:
        - Return ONLY the JSON object.
        - If no solution is available, set the "solution" field to null.
        - Ensure the response is valid JSON.
    `
};

/**
 * Generates the user prompt for a specific log and its context.
 * 
 * @param log - The raw log content.
 * @param metadata - Optional metadata about the log (e.g., language, project).
 * @returns The formatted user prompt string.
 */
export const getLogExplainerUserPrompt = (log: string, metadata?: Record<string, any>) => {
    let prompt = `Analyze this log: \n\n\`\`\`\n${log}\n\`\`\`\n`;

    if (metadata && Object.keys(metadata).length > 0) {
        prompt += `\nAdditional Context:\n${JSON.stringify(metadata, null, 2)}\n`;
    }

    return prompt;
};
