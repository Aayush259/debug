# Core Concepts - Krvyu SaaS Platform

This document defines and explains the core concepts within the Krvyu platform. It maps these concepts across the backend and frontend, highlighting naming differences where they exist.

---

## 1. User
The **User** is the primary entity of the Krvyu platform.

A developer or client who uses Krvyu to monitor their applications and resolve AI-generated debugging insights.
- **Backend naming:** `User`
- **Frontend naming:** `User`
- **Lifecycle:**
    1. Register/Authenticate with Krvyu.
    2. Create Projects and generate Secret Keys.
    3. Integrate the Krvyu SDK into their external applications.
    4. Review and resolve AI Insights.

## 2. UserSettings
**UserSettings** manage the personalized configuration of the Krvyu analysis engine.

Configuration that determines which AI models are used to process logs and how those models are authenticated.
- **Backend naming:** `User Settings`
- **Frontend naming:** `User Settings`
- **Key Features:**
    - **Model Provider:** Choose between Google, OpenAI, or Anthropic.
    - **Model Selection:** Specify the version of the AI model (e.g., `gemini-flash-latest`).
    - **API Key Management:** Storage for user-provided API keys (BYOK).
    - **Quota Management:** Toggle between using Krvyu's free tier quota or personal API keys.
    - **Feature Toggles:**
        - `aiInsightsEnabled`: Globally enable/disable AI-powered log analysis.
        - `emailErrorLogs`: Toggle email notifications for critical error logs.
- **Plan-Based Restrictions (Hobby Tier):**
    - The "Hobby" plan is restricted from modifying AI providers, selecting custom models, and using personal API keys. These settings are locked to system defaults (`Google` / `Gemini Flash`).
    - Email notifications (`emailErrorLogs`) are not supported on the Hobby tier.

## 3. LogsDebug (AI Insight)
A **LogsDebug** entry is the intelligence layer of the Krvyu platform.

An AI-generated report that provides an explanation and potential solution for an error captured from an application.
- **Backend naming:** `LogsDebug`
- **Frontend naming:** `AI Insight`
- **Workflow:**
    1. **Trigger:** `logWorker` identifies an error in `ProjectLogs`.
    2. **Analysis:** AI processes the log and generates an "AI Insight".
    3. **Action:** The developer reviews the insight and suggestion.
    4. **Resolution:** The insight is marked as "resolved" once fixed.

## 4. ProjectLogs (Log)
**ProjectLogs** are the raw data points flowing into the Krvyu system.

Individual events or messages emitted by a developer's application and captured by the Krvyu service.
- **Backend naming:** `Project Logs`
- **Frontend naming:** `Log`
- **Role:** These logs serve as raw input for the AI analysis engine. They include a severity level (`info`, `warn`, `error`) and the log content itself.

## 5. SecretKey (Project)
A **SecretKey** acts as the secure bridge between an external application and Zag.

Additional Project Concepts:
- **Backend naming:** `Secret Key`
- **Frontend naming:** `Project`
- **Active Project Gating:** To prevent misuse after plan downgrades or expirations, Zag restricts log ingestion to the oldest **N** projects (where N is the limit for the user's plan). Logs sent to projects outside this "active" set are rejected with a `403 Forbidden` status.
- **Quota Management:** Project creation is subject to plan-based limits. Each user account is assigned a `UserPlan` that defines the total number of projects (`totalProjects`) allowed.

---

## 6. Log Quota Management & Rotation
The Zag platform uses a quota-based system to ensure fair resource allocation and optimal performance.

### A. Preserved Logs Quota
Each user is assigned a `totalPreservedLogs` quota (stored in `UserPlan`). This represents the total number of log entries the platform will persist for them across all their projects.
- **Consumption:** Every successful log ingestion decrements this global quota.
- **Recovery:** When a log is deleted, the quota slot is refunded to the user's account-wide balance.

### B. Global Log Rotation (FIFO)
To maintain reliability without exceeding account-wide storage limits, Zag implements **Global First-In-First-Out (FIFO) Rotation**. 
- When a user's total log count (across all projects) reaches their `totalPreservedLogs` limit, the ingestion engine automatically identifies and deletes the **oldest logs across all projects** belonging to that user.
- This ensures that a user's account never exceeds its storage limit, while always making room for the most recent data from their active projects.

### C. AI Insight Quota
AI-powered analysis is governed by `remainingFreeInsights`.
- Users on the free tier have a limited number of "automated" insights.
- Once this quota is exhausted, logs will still be ingested, but automated AI analysis will pause until the quota resets or the user switches to using their own API keys (where supported). For hobby plan, the quota never resets, but for other plans, it gets reset monthly.

- **Hobby Plan:** Entry-level tier. Does not support BYOK (Bring Your Own Key) or off-platform email alerts. AI analysis is restricted to the platform's default provider and model. Inactive logs are retained for 1 day.
- **Developer/Enterprise Plans:** Support full customization of AI providers, personal API key usage, and comprehensive cross-channel notifications. Inactive logs are retained for 7/30 days respectively.

### E. Inactivity-based Retention
To keep the database lean and performant, Zag automatically identifies and purges logs from projects that have stopped sending data.
- **Hobby:** 1 day inactivity limit.
- **Developer:** 7 days inactivity limit.
- **Enterprise:** 30 days inactivity limit.
When a project exceeds its limit, all of its logs and AI insights are deleted, and the global quota is refunded to the user.
