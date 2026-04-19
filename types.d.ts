type LogLevel = "info" | "warn" | "error";
type AIProvider = "google" | "openai" | "anthropic";
type TPlanType = "hobby" | "developer" | "enterprise";

interface AIModelRegistryItem {
    id: string;
    isActive: string;
    createdAt: number;
    owned_by: "google" | "openai" | "anthropic";
    name: string;
    description: string;
};

interface ProcessLogJobData {
    projectLogId: string;
    secretKeyId: string;
    userId: string;
    logContent: string;
};

interface GenerateExplanationParams {
    provider: AIProvider;
    modelName: string;
    apiKey: string;
    log: string;
    metadata?: Record<string, any>;
};

