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
