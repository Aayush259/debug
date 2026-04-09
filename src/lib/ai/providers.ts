/**
 * @file providers.ts
 * @description Multi-vendor abstraction layer for AI model instantiation.
 * 
 * CORE CONCEPT:
 * This file provides a unified interface for interacting with various AI 
 * providers (OpenAI, Anthropic, Google). It leverages the Vercel AI SDK 
 * to normalize model behavior and configuration across different vendors.
 * 
 * Capabilities:
 * 1. Multi-Cloud Instantiation: Handles the specific SDK calls required 
 *    to initialize models from three major vendors.
 * 2. Secure Auth Injection: Injects user-provided API keys (decrypted in 
 *    the worker layer) into the provider-specific delivery mechanisms.
 * 3. Identifier Normalization: Standardizes model IDs (e.g., stripping 
 *    provider prefixes) to match the expectations of individual vendor SDKs.
 * 
 * Infrastructure:
 * - Built on the Vercel AI SDK (`ai` package) for cross-provider compatibility.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

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
