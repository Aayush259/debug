# Zag Project Flows

## 1. Multi-Layer Authentication & Settings Configuration

Zag utilizes a distributed authentication strategy to ensure consistent identity across RESTful APIs and real-time WebSocket streams.

### A. Authentication Lifecycle (Better Auth)
The platform delegates identity management to **Better Auth**, configured with a **MongoDB Adapter** for persistent session tracking.

![Authentication Flow](../images/auth_flow.png)

- **Social Integration:** GitHub and Google OAuth are the primary entry points. Email/Password is deliberately disabled to enforce secure social identity.
- **Trusted Origins:** The backend strictly enforces CORS and Better Auth trusted origins based on the `FRONTEND_URL` environment variable.
- **Socket.IO Integration:** For real-time data, the WebSocket handshake intercepts headers. It manually extracts the session using `auth.api.getSession()`. If no valid session is found, the connection is terminated with an `Unauthorized` error before reaching the event handlers.

### B. Encrypted Settings Persistence (AES-256)
Personal AI configuration requires securing sensitive third-party API keys (OpenAI, Anthropic, Gemini).

- **Algorithm:** `aes-256-cbc`.
- **Key Derivation:** A 256-bit master key is derived from the project's `ENCRYPTION_KEY` using `crypto.scryptSync` with a fixed salt.
- **Layered Security:**
    1. **Encryption:** Each key is encrypted with a unique, randomized 16-byte Initialization Vector (IV). The stored format is `iv:ciphertext`.
    2. **Retrieval:** When the dashboard requests settings, keys are decrypted on-the-fly. If decryption fails (e.g., due to key rotation or malformed data), the platform falls back to returning the raw string to prevent system crashes.
    3. **Visibility:** The API only returns decrypted keys to the authenticated owner; they are never leaked in logs or to other users.

---

## 2. Project Tokenization & Secure Ingestion

Zag uses a hashed-token strategy (similar to GitHub Personal Access Tokens) to bridge external logs into the platform without compromising project security.

### A. Secret Key Generation Workflow
![Project Tokenization](../images/project_tokenization.png)

- **UUID Generation:** Uses `crypto.randomUUID()` to ensure collision-resistant, 128-bit project tokens.
- **One-Way Hashing:** The `SecretKey` model utilizes an asynchronous `pre-save` middleware to hash the `key` field with `bcrypt` (Salt Rounds: 10).
- **Validation:** During ingestion, the platform performs a `bcrypt.compare` between the incoming raw token and the stored hash. This ensures that even a full database leak would not reveal the actual API keys used by developers.

---

## 3. The Log-to-Insight Pipeline (Async AI Engine)

The core value proposition of Zag is the asynchronous transformation of raw logs into AI-powered solutions.

### A. Phase 1: High-Throughput Ingestion
The public ingestion endpoint (`POST /api/logs/:keyId`) is designed for speed.

1. **Extraction:** Receives an array of logs (structured or raw strings).
2. **Auto-Classification:** Logs without an explicit level run through `classifyLog`, which uses regex patterns to identify keywords like `error`, `exception`, `fatal`, or `stack trace`.
3. **Database Bulk Insert:** Processed logs are batch-inserted via `insertMany` for efficiency.
4. **Dashboard Broadcast:** The system retrieves the `io` instance and emits `GET_LOGS` to the user's specific room (identified by `userId`).

### B. Phase 2: Background Orchestration (BullMQ)
Logs flagged as `warn` or `error` enter the AI pipeline managed by **BullMQ** and **Redis**.

![Log-to-Insight Pipeline](../images/log_to_insight.png)

- **Resilience:** Jobs are configured with **3 retry attempts** and **exponential backoff** (1s base).
- **Settings Check:** Before analysis, the worker verifies if `aiInsightsEnabled` is set to `true` in the `UserSettings`. If disabled, the AI analysis phase is skipped entirely.
- **Deduplication Logic:** To prevent redundant LLM costs, the worker queries the last 10 identical logs for the same project. If an insight already exists for that specific error message, it "clones" the previous explanation and solution instead of re-analyzing (only if AI insights are enabled).

### C. Phase 3: AI Analysis & Multi-Model Support
Zag uses a modular AI layer to interface with various LLMs via the `ai` library.

1. **Context Construction:** The system combines the raw log with specialized **System Prompts** (`LOG_EXPLAINER`) that instruct the AI to return a specific JSON schema.
2. **Provider Resolution:** Based on `UserSettings`, the engine instantiates the correct model (Google Gemini, OpenAI GPT-4, etc.) using the user's decrypted API key.
3. **Response Parsing:** The AI's markdown output is parsed via regex to extract the JSON block. A fallback mechanism handles malformed responses by saving the raw text as the "Explanation" and defaulting the severity to "medium".

### D. Phase 4: Cross-Channel Notification
Once an insight is persisted, Zag triggers a multi-pronged notification flow, subject to user preferences:

1. **Real-time (Redis Pub/Sub):**
    - Triggered only if `aiInsightsEnabled` is active and an insight was generated.
    - The worker publishes to the `ai-insight-channel`.
    - A dedicated **Redis Subscriber** (running in the main server process) receives the message and pushes it through the WebSocket to the frontend.
2. **Off-Platform (Email):**
    - Triggered only if `emailErrorLogs` is enabled in `UserSettings`.
    - **Nodemailer** constructs a rich HTML email.
    - It highlights the error and, if available, provides a "glimpse" of the AI insight with a link back to the Zag dashboard.
