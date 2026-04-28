/**
 * @file utils.ts
 * @description Centralized definition of Socket.IO event constants and utility functions.
 * 
 * CORE CONCEPT:
 * This module acts as the "Contract" between the Frontend (UI) and Backend (Server).
 * By defining these events in one place, we ensure type safety and prevent runtime 
 * errors caused by typos (e.g., "getLogs" vs "get-logs").
 * 
 * Socket.IO Event Architecture:
 * - Connection Events: Handle the lifecycle of a client connecting or disconnecting.
 * - Data Events: Trigger the flow of information (Logs, Insights) between client and server.
 */

export const EVENTS = {
    // Lifecycle Events
    CONNECTION: "connection",
    DISCONNECT: "disconnect",

    // Application Events
    GET_LOGS: "get-logs",
    NEW_AI_INSIGHT: "new-ai-insight"
}