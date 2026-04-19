/**
 * @file modelsRegistry.ts
 * @description Centralized directory of supported AI models for the Krvyu platform.
 * 
 * CORE CONCEPT:
 * The Model Registry acts as the definitive catalog of Large Language Models 
 * (LLMs) that developers can choose from within the Krvyu Dashboard. It 
 * provides the necessary metadata to power the frontend selection menus 
 * and backend provider configurations.
 * 
 * Capabilities:
 * 1. Multi-Provider Support: Catalogues models from Anthropic, OpenAI, and Google.
 * 2. Static Metadata: Stores human-readable names, descriptions, and 
 *    provider identifiers for each model.
 * 3. Frontend Integration: This data is directly consumed by the Krvyu Frontend 
 *    to populate settings and configuration menus.
 * 4. System Extensibility: Adding support for a new AI model simply requires 
 *    adding an entry to this registry.
 */

export const anthropicModels: AIModelRegistryItem[] = [
    {
        id: "anthropic/claude-3-7-sonnet-latest",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "anthropic",
        name: "Claude 3.7 Sonnet (Latest)",
        description: "Balanced flagship Claude model suitable for most tasks; strong reasoning, coding, and chat.",
    },
    {
        id: "anthropic/claude-3-5-sonnet-latest",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "anthropic",
        name: "Claude 3.5 Sonnet (Latest)",
        description: "Highly capable Claude 3.5 series model offering a good balance of speed and quality.",
    },
    {
        id: "anthropic/claude-3-5-haiku-latest",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "anthropic",
        name: "Claude 3.5 Haiku (Latest)",
        description: "Fast, lightweight Claude model optimized for low-latency, high-throughput workloads.",
    },
];

export const openaiModels: AIModelRegistryItem[] = [
    {
        id: "openai/gpt-4o",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "openai",
        name: "GPT-4o",
        description: "Small, fast GPT-4.1 family model great for everyday tasks, tools, and high-volume workloads.",
    },
    {
        id: "openai/gpt-4o-mini",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "openai",
        name: "GPT-4o-mini",
        description: "General-purpose GPT-4.1 model with strong reasoning, coding, and multilingual capabilities.",
    },
    {
        id: "openai/o3-mini",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "openai",
        name: "o3-mini",
        description: "Reasoning-focused OpenAI model optimized for complex problem solving at a lower cost.",
    },
    {
        id: "openai/o1",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "openai",
        name: "o1",
        description: "Reasoning-focused OpenAI model optimized for complex problem solving at a lower cost.",
    },
];

export const googleModels: AIModelRegistryItem[] = [
    {
        id: "google/gemini-3.1-pro-preview",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini 3.1 Pro Preview",
        description: "Fast, cost-efficient Gemini model ideal for real-time interactions and high-throughput use cases.",
    },
    {
        id: "google/gemini-flash-latest",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini Flash Latest",
        description: "General-purpose Gemini model with strong reasoning and coding performance.",
    },
    {
        id: "google/gemini-2.0-flash",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini 2.0 Flash",
        description: "General-purpose Gemini model with strong reasoning and coding performance.",
    },
    {
        id: "google/gemini-2.0-pro-exp",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini 2.0 Pro Exp.",
        description: "Previous-generation Gemini model with long-context support and solid reasoning abilities.",
    },
    {
        id: "google/gemini-1.5-pro",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini 1.5 Pro",
        description: "Previous-generation Gemini model with long-context support and solid reasoning abilities.",
    },
    {
        id: "google/gemini-1.5-flash",
        isActive: "true",
        createdAt: Date.now(),
        owned_by: "google",
        name: "Gemini 1.5 Flash",
        description: "Previous-generation Gemini model with long-context support and solid reasoning abilities.",
    },
];

export const allModels: AIModelRegistryItem[] = [
    ...anthropicModels,
    ...openaiModels,
    ...googleModels,
];

