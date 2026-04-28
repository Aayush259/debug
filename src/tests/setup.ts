/**
 * @file setup.ts
 * @description Global Vitest setup configuration and environment orchestration.
 * 
 * CORE CONCEPT:
 * This file serves as the initial "pre-flight" script for the entire test suite. 
 * Its primary responsibility is to ensure the testing environment is isolated 
 * from the development/production environments by forcing the loading of 
 * mock configuration.
 * 
 * Orchestration Details:
 * 1. Environment Isolation: Explicitly loads `.env.test` using `dotenv`. 
 *    This is critical to prevent tests from accidentally mutating production 
 *    databases or sending real emails.
 * 2. MongoDB Orchestration: Initializes an in-memory MongoDB server instance 
 *    using `mongodb-memory-server`. This provides a real database for integration 
 *    testing without requiring a local installation or genuine credentials.
 * 3. Connection Management: Handles the lifecycle of the test database, ensuring 
 *    connections are established before tests and teardown is performed after.
 */

// IMPORTANT: env-loader must be the VERY FIRST import to ensure 
// process.env.MONGO_URI is set before any local modules are loaded.
import { mongod } from "./env-loader.js";

import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach, vi } from "vitest";


// We mock these globally to ensure no test ever accidentally hits a 
// real (and potentially expensive) AI API.

vi.mock("ai", () => ({
    generateText: vi.fn(),
    streamText: vi.fn(),
}));

vi.mock("../lib/ai/providers.js", () => ({
    getLanguageModel: vi.fn(() => ({
        modelId: "mock-model",
    })),
}));

// Mock nodemailer
export const mockSendMail = vi.fn().mockResolvedValue({ messageId: "mock-id" });
vi.mock("nodemailer", () => ({
    default: {
        createTransport: vi.fn(() => ({
            sendMail: mockSendMail,
        })),
    },
}));

// Mock redis
vi.mock("ioredis", async () => {
    const RedisMock = (await import("ioredis-mock")).default;
    return {
        default: RedisMock,
    };
});

// Mock bullmq
(globalThis as any).workerProcessors = new Map<string, any>();

vi.mock("bullmq", () => {
    return {
        Queue: vi.fn().mockImplementation(function () {
            return {
                add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
            };
        }),
        Worker: vi.fn().mockImplementation(function (name, processor) {
            (globalThis as any).workerProcessors.set(name, processor);
            return {
                on: vi.fn(),
            };
        }),
    };
});

// Mock lemonsqueezy
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
    lemonSqueezySetup: vi.fn(),
    createCheckout: vi.fn(),
    getSubscription: vi.fn(),
}));

// Mock auth
vi.mock("../lib/auth.js", async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    const mockGetSession = vi.fn();
    return {
        ...actual,
        auth: {
            ...actual.auth,
            api: {
                ...actual.auth?.api,
                getSession: mockGetSession,
            },
        },
    };
});

import { auth } from "../lib/auth.js";

/**
 * Global helper to mock an authenticated session for integration tests.
 * This allows us to simulate a logged-in user with specific metadata.
 */
export const setTestUser = (user: any | null) => {
    const getSession = auth.api.getSession as any;
    if (user) {
        getSession.mockResolvedValue({
            user,
            session: {
                id: "sess_mock",
                expiresAt: new Date(Date.now() + 100000),
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: user.id,
                token: "mock-token",
                ipAddress: "127.0.0.1",
                userAgent: "Vitest"
            }
        });
    } else {
        getSession.mockResolvedValue(null);
    }
};

import { connectDB } from "../lib/database/database.js";

beforeAll(async () => {
    // Connect to the in-memory database
    await connectDB();
});

afterAll(async () => {
    // Shutdown the in-memory server and disconnect mongoose
    if (mongod) {
        await mongod.stop();
    }
    await mongoose.disconnect();
});

afterEach(async () => {
    // Clear collections between tests to keep them isolated
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    }
});
