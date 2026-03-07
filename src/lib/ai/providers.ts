import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

export type AIProvider = "google" | "openai" | "anthropic";

/**
 * Get a language model instance for the specified provider and model.
 * 
 * @param provider - The name of the AI provider ("google", "openai", "anthropic").
 * @param modelName - The specific model name (e.g., "gemini-1.5-flash", "gpt-4o").
 * @param apiKey - The API key for the chosen provider.
 * @returns An instance of the language model from the Vercel AI SDK.
 */
export const getLanguageModel = (provider: AIProvider, modelName: string, apiKey: string) => {
    if (!apiKey) {
        throw new Error(`API key for provider "${provider}" is missing.`);
    }

    // Many UIs/DBs save models as "provider/model" (e.g., "google/gemini-2.0-flash").
    // The individual Vercel AI provider instances expect just the model name itself.
    const cleanModelName = modelName.includes('/') ? modelName.split('/').slice(1).join('/') : modelName;

    switch (provider) {
        case "google":
            const google = createGoogleGenerativeAI({
                apiKey: apiKey,
            });
            return google(cleanModelName);

        case "openai":
            const openai = createOpenAI({
                apiKey: apiKey,
            });
            return openai(cleanModelName);

        case "anthropic":
            const anthropic = createAnthropic({
                apiKey: apiKey,
            });
            return anthropic(cleanModelName);

        default:
            throw new Error(`AI Provider "${provider}" is not supported.`);
    }
};
