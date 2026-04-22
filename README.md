# Krvyu | AI-Native Log Management & Insights

> [!IMPORTANT]
> **Internal Documentation Only.** This repository contains proprietary logic for the Krvyu platform. Do not distribute or mirror to public repositories.

Krvyu is a high-performance, AI-native log management platform designed for real-time observability. It enables developers to stream logs from any service, classify them automatically, and generate actionable AI insights using a distributed background processing architecture.

---

## 🏗️ System Architecture

The Krvyu ecosystem is split into a **Distributed Backend** and a **Modern Frontend**, coordinated via a real-time event bus.

### **Core Stack**
- **Frontend**: React 19 (Vite), Tailwind CSS 4, Redux Toolkit, Framer Motion.
- **Backend**: Node.js (Express 5), TypeScript.
- **Database**: MongoDB (Primary Persistence).
- **Caching & Queues**: Redis (ioredis) + BullMQ (Background Jobs).
- **AI Integration**: Vercel AI SDK (OpenAI, Google Gemini, Anthropic).
- **Authentication**: Better-Auth (Social + Session based).
- **Billing**: Lemon Squeezy (Recurring Subscriptions + Webhooks).

### **🔄 High-Level Data Flow**
1.  **Ingestion**: Client sends logs via POST `/api/logs/:keyId`.
2.  **Streaming**: Backend emits raw logs via Socket.io to active dashboard users.
3.  **Queuing**: Logs are pushed to `ai-insight-queue` (Redis).
4.  **Processing**: `logWorker` consumes the queue, calls the LLM, and persists insights to MongoDB.
5.  **Notification**: Insight results are published to a Redis channel and pushed to the frontend via Socket.io.

---

## 🚀 Getting Started

### **Infrastructure Requirements**
1.  **Node.js**: v20 or higher.
2.  **MongoDB**: v6.0+.
3.  **Redis**: v7.0+ (Required for BullMQ and Socket.io Pub/Sub).

### **Installation**

#### **1. Backend (`/debug`)**
```bash
npm install
npm run dev
```

#### **2. Frontend (`/debug-frontend`)**
```bash
npm install
npm run dev
```

---

## 🛠️ Environment Configuration

Both services require specific `.env` configurations. Use `env.example` as a template.

### **Backend Keys (`/debug/.env`)**
| Variable | Description |
| :--- | :--- |
| `MONGO_URI` | MongoDB Connection String. |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection for queues and sockets. |
| `BETTER_AUTH_SECRET` | 32-character random string for session encryption. |
| `ENCRYPTION_KEY` | Used to encrypt project-specific API keys at rest (`aes-256-cbc`). |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Required for validating billing event signatures. |
| `LLM_PROVIDER` | `google` \| `openai` \| `anthropic`. |
| `LLM_API_KEY` | Credential for the selected primary AI provider. |

### **Frontend Keys (`/debug-frontend/.env`)**
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Backend API Endpoint (e.g., `http://localhost:3000`). |
| `VITE_BETTER_AUTH_URL` | Auth service endpoint. |

---

## 🧩 Domain Modules

### **1. AI Insights Pipeline**
Logs ingested via `/api/logs/:keyId` are queued in **BullMQ**. A background worker (`logWorker.ts`) processes these logs:
1.  **Classification**: Logs are categorized as `error`, `warn`, or `info`.
2.  **AI Analysis**: Errors are analyzed via the configured LLM provider.
3.  **Real-time Notification**: Results are published to Redis and emitted to the frontend via Socket.io.

### **2. Subscription & Billing**
Integrated with **Lemon Squeezy**, supporting three tiers:
-   **Hobby**: 10 total AI insights, 1 project, 1-day log retention.
-   **Developer**: 200 monthly AI insights, 5 projects, 7-day log retention.
-   **Enterprise**: 2000 monthly AI insights, unlimited projects, 30-day log retention.

### **3. Log Retention Engine**
A daily cron job (`retentionWorker.ts`) runs at midnight to purge logs exceeding the project's plan-based retention window. This ensures database performance and storage optimization.

---

## 📂 Directory Structure

### **Backend (`/src`)**
-   `config/`: Normalized configuration and feature flags.
-   `controllers/`: Domain-specific request handlers.
-   `lib/`: Core logic (AI, Auth, Billing, Encryption).
-   `middleware/`: Auth guards and validation layers.
-   `models/`: Mongoose schemas.
-   `socket/`: Real-time event handlers and namespace management.
-   `workers/`: BullMQ job consumers.

### **Frontend (`/src`)**
-   `app/`: API clients, Redux store, and global routes.
-   `components/`: Reusable UI primitives (Tailwind 4).
-   `pages/`: Feature-complete views (Dashboard, Logs, Settings).
-   `context/`: Shared state providers.

---

## 🔒 Security Best Practices
-   **API Key Masking**: Service keys (OpenAI, etc.) are encrypted before storage using `src/lib/encryption.ts`.
-   **Webhook Validation**: All Lemon Squeezy events use `timingSafeEqual` signature verification.
-   **Auth**: Managed via Better-Auth node handler; sessions are verified on both REST and Socket.io layers.

---
