
interface AIModelRegistryItem {
    id: string;
    isActive: string;
    createdAt: number;
    owned_by: "google" | "openai" | "anthropic";
    name: string;
    description: string;
};

