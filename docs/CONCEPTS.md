# Core Concepts - Zag SaaS Platform

This document defines and explains the core concepts within the Zag platform. It maps these concepts across the backend and frontend, highlighting naming differences where they exist.

---

## 1. User
The **User** is the primary entity of the Zag platform.

A developer or client who uses Zag to monitor their applications and resolve AI-generated debugging insights.
- **Backend naming:** `User`
- **Frontend naming:** `User`
- **Lifecycle:**
    1. Register/Authenticate with Zag.
    2. Create Projects and generate Secret Keys.
    3. Integrate the Zag SDK into their external applications.
    4. Review and resolve AI Insights.

## 2. UserSettings
**UserSettings** manage the personalized configuration of the Zag analysis engine.

Configuration that determines which AI models are used to process logs and how those models are authenticated.
- **Backend naming:** `User Settings`
- **Frontend naming:** `User Settings`
- **Key Features:**
    - **Model Provider:** Choose between Google, OpenAI, or Anthropic.
    - **Model Selection:** Specify the version of the AI model (e.g., `gemini-2.0-flash`).
    - **API Key Management:** Storage for user-provided API keys.
    - **Quota Management:** Toggle between using Zag's free tier quota or personal API keys.
    - **Feature Toggles:**
        - `aiInsightsEnabled`: Globally enable/disable AI-powered log analysis.
        - `emailErrorLogs`: Toggle email notifications for critical error logs.

## 3. LogsDebug (AI Insight)
A **LogsDebug** entry is the intelligence layer of the Zag platform.

An AI-generated report that provides an explanation and potential solution for an error captured from an application.
- **Backend naming:** `LogsDebug`
- **Frontend naming:** `AI Insight`
- **Workflow:**
    1. **Trigger:** `logWorker` identifies an error in `ProjectLogs`.
    2. **Analysis:** AI processes the log and generates an "AI Insight".
    3. **Action:** The developer reviews the insight and suggestion.
    4. **Resolution:** The insight is marked as "resolved" once fixed.

## 4. ProjectLogs (Log)
**ProjectLogs** are the raw data points flowing into the Zag system.

Individual events or messages emitted by a developer's application and captured by the Zag service.
- **Backend naming:** `Project Logs`
- **Frontend naming:** `Log`
- **Role:** These logs serve as raw input for the AI analysis engine. They include a severity level (`info`, `warn`, `error`) and the log content itself.

## 5. SecretKey (Project)
A **SecretKey** acts as the secure bridge between an external application and Zag.

A secure token assigned to a specific application (Project) used for authenticating log transmissions.
- **Backend naming:** `Secret Key`
- **Frontend naming:** `Project`
- **Quota Management:** Project creation is subject to plan-based limits. Each user account is assigned a `UserPlan` that defines the total number of projects (`totalProjects`) allowed and tracks the `remainingProjects` balance.
- **Crucial Notes:**
    - **Mapping:** In the backend, a `SecretKey` document defines the "Project" via its `projectName` field. The frontend treats this document as a project entity.
    - **Security:** Raw API keys are **never** stored in the database. Only their `bcrypt` hashes are saved.
    - **Validation:** incoming logs are validated by comparing their provided key against the stored hash.
