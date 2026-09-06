# ReachInbox.ai — Full-Stack Email Job Scheduler & Dashboard

A production-grade, fault-tolerant cold email scheduling service and real-time dashboard built for **ReachInbox (Outbox Labs)**.

Engineered with **Express.js**, **TypeScript**, **BullMQ**, **Redis**, **Prisma ORM**, **Ethereal Fake SMTP**, **Elasticsearch**, **Slack Notifications**, and a **React 19 + Tailwind CSS** frontend styled to match the ReachInbox Figma design.

---

## 🌟 System Architecture & High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ReachInbox Client UI                            │
│           (React 19 + TypeScript + Tailwind CSS + Lucide + Google OAuth)    │
│  - Scheduled Emails Table   - Sent Emails (with Ethereal View) - Search Bar │
│  - Compose Modal + CSV Lead Parser   - Slack OAuth / Webhook Settings Modal │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (JSON / Multipart)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Express.js Backend Service                         │
│  - Email Controller    - Auth Controller (Google OAuth + Demo)              │
│  - Slack Controller    - Sender Controller (Multi-Sender Limits)            │
│  - BullBoard Router (`/admin/queues`) for live queue visibility             │
└───────┬──────────────────────────────┬──────────────────────────────┬───────┘
        │                              │                              │
        ▼                              ▼                              ▼
┌──────────────┐              ┌────────────────┐              ┌───────────────┐
│   Database   │              │ Redis (6379)   │              │ Elasticsearch │
│ SQLite/MySQL │              │ BullMQ Queue + │              │ (9200) Full-  │
│ (Prisma ORM) │              │ Rate Limit Key │              │ text Search   │
└───────┬──────┘              └────────┬───────┘              └───────┬───────┘
        │                              │                              │
        │             ┌────────────────┴────────────────┐             │
        │             │      BullMQ Email Worker        │             │
        │             │  - Concurrency: Configurable    │             │
        │             │  - Provider Throttling Delay    │             │
        │             │  - Hourly Rate Limiting         │             │
        │             │  - Next-Hour Rescheduling       │             │
        │             │  - Slack Rate Limit Alerting    │             │
        │             └────────────────┬────────────────┘             │
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │       Ethereal Fake SMTP         │
                     │  - Nodemailer transporter        │
                     │  - Live Message preview URLs     │
                     └──────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v22)
- **Redis**: Running on `localhost:6379` (a pre-bundled standalone binary is provided in `tools/redis/redis-server.exe`)

---

### Step 1: Start Redis
Run the bundled Redis server binary or your own Redis instance:
```powershell
# Windows (using included binary)
.\tools\redis\redis-server.exe

# Or via Docker:
docker run -d -p 6379:6379 redis:alpine
```

---

### Step 2: Run the Backend Service
```bash
cd server
npm install
npm run prisma:push
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Live BullMQ Queue Dashboard**: `http://localhost:5000/admin/queues`

---

### Step 3: Run the Frontend Dashboard
```bash
cd client
npm install
npm run dev
```
- **Frontend Dashboard**: `http://localhost:3000`

---

## ⚙️ Environment Variables Configuration

### Backend (`server/.env`)
```env
PORT=5000
DATABASE_URL="file:./dev.db"

# Redis Configuration (BullMQ + Rate Limiting)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Worker & Scheduling Concurrency
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR=200

# Elasticsearch (Graceful fallback to DB if offline)
ELASTICSEARCH_NODE=http://localhost:9200

# Slack Integration (OAuth or Incoming Webhook)
SLACK_WEBHOOK_URL=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=

# Ethereal Email (Auto-generated on first boot if blank)
ETHEREAL_USER=
ETHEREAL_PASS=
```

> **Ethereal Email Auto-Provisioning:**
> If `ETHEREAL_USER` and `ETHEREAL_PASS` are left empty, the server automatically provisions a throwaway Ethereal test account on boot using `nodemailer.createTestAccount()`. Every sent email receives a live web preview link accessible in the Sent Emails table!

---

## 🏛️ Technical Deep-Dive & Architecture

### 1. No-Cron Scheduling via BullMQ Delayed Jobs
- OS-level cron (`crontab`) and Node cron libraries (`node-cron`, `agenda`) are **strictly prohibited** in this project.
- Scheduling is powered by BullMQ's native delayed job mechanism:
  ```ts
  const delay = Math.max(0, new Date(scheduledTime).getTime() - Date.now());
  await emailQueue.add('sendEmail', jobData, { delay, jobId: `email-${emailId}` });
  ```
- **Strict Idempotency:** The BullMQ `jobId` is deterministically derived from the database UUID (`email-${emailId}`). Duplicate additions are safely de-duplicated by Redis without duplicating tasks.

---

### 2. Server Restart Persistence & State Reconciliation Routine
To guarantee that scheduled emails survive crashes or server restarts without lost jobs or duplicates:
1. **Queue Persistence in Redis:** BullMQ delayed jobs are saved in Redis Sorted Sets (`bull:email-job-queue:delayed`). Even if the Node process dies, jobs remain scheduled in Redis.
2. **Database Reconciliation on Boot (`reconcilePendingJobsOnStartup`):**
   - On server startup, the backend queries the database for all records with status `PENDING`, `PROCESSING`, or `RATE_LIMITED`.
   - If an email was mid-flight (`PROCESSING`) when the server crashed, its status is restored to `PENDING`.
   - For every pending email, the service verifies whether its corresponding job exists in BullMQ.
   - If missing (e.g. if Redis had flushed or restarted), it re-enqueues the job with its exact remaining delay: `Math.max(0, scheduledTime - Date.now())`.
   - Idempotency guard prevents duplicate re-sends.

---

### 3. Worker Concurrency & Provider Throttling Delay
- **Configurable Worker Concurrency:** Configured via `WORKER_CONCURRENCY` (default: `5`). Workers process multiple queue jobs concurrently.
- **Inter-Email Provider Throttling:** Real-world email providers (Google Workspace, Outlook, SendGrid) penalize bursts. An inter-send throttling delay (`MIN_DELAY_BETWEEN_EMAILS_MS`, default: `2000ms`) is enforced in worker logic:
  ```ts
  const minDelay = config.worker.minDelayBetweenEmailsMs;
  if (minDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, minDelay));
  }
  ```

---

### 4. Hourly Rate Limiting & Next-Hour Rescheduling
- **Per-Sender Quotas:** Each sender has an `hourlyLimit` (e.g. 200/hr, 50/hr, or configurable per sender profile).
- **Distributed Redis Counter:** Rate limits are counted atomically across multiple worker instances:
  ```ts
  const hourWindow = new Date().toISOString().slice(0, 13); // "2026-09-06T12"
  const rateLimitKey = `ratelimit:${senderId}:${hourWindow}`;
  const count = await redisConnection.incr(rateLimitKey);
  ```
- **Zero Job Dropping:** When the quota is exceeded:
  - The job is **not dropped or marked failed**.
  - The scheduler computes the start of the next hour window (`nextHour = new Date(Date.UTC(..., nextHour, 0, 5, 0))`).
  - The job is postponed and rescheduled in BullMQ with delay `nextHour.getTime() - Date.now()`.
  - Database status updates to `RATE_LIMITED`.

---

### 5. Live Slack Alerts on Rate Limit Hit
- **Real OAuth & Webhook Support:** Connect Slack through OAuth or paste an Incoming Webhook URL in the dashboard modal.
- **Live Verifiable Alerting:** The exact moment a sender hits their limit, an alert is sent to Slack with block kit formatting showing:
  - Sender email
  - Hourly limit exceeded
  - Timestamp when sending will automatically resume
- **Graceful Disconnect/Reconnect:** If Slack is not connected, the rate-limiting logic continues smoothly without crashing. Once connected, alerts start delivering without restarting the server.
- **Built-in Demo Trigger:** The Slack modal contains a **"Test Live Alert"** button for immediate verification during video recording!

---

### 6. Elasticsearch Indexing with Relational Fallback
- Indexes email metadata (`recipientEmail`, `subject`, `body`, `senderEmail`, `status`, `createdAt`) in `reachinbox_emails`.
- Offers fuzzy, multi-match search with boost weights on recipient and subject.
- **Graceful Degradation:** If Elasticsearch is not running on port 9200, the system automatically logs a clean warning and falls back to relational database queries without user-facing errors.

---

### 7. Live BullMQ Monitoring Dashboard
- Hosted at `http://localhost:5000/admin/queues` using `@bull-board/express`.
- Shows real-time counts and states for:
  - **Delayed jobs** (future scheduled emails)
  - **Active jobs** (currently transmitting via SMTP)
  - **Completed jobs** (successfully delivered with preview links)
  - **Failed jobs** (with full stack traces and retry buttons)

---

## 🎨 Frontend Highlights (Figma Alignment)

1. **Google OAuth Login:**
   - Real Google OAuth login button with backend ID token verification.
   - Demo Evaluator login button for instant 1-click evaluation without configuring Google Cloud Console credentials.
2. **Top Navigation Header:**
   - ReachInbox logo, live BullMQ link, Slack status pill with live connection indicator, user profile avatar, name, email, and logout.
3. **Compose Campaign Modal:**
   - Recipient Leads Upload: Drag-and-drop CSV or TXT files.
   - Live parsing: shows `✓ X email addresses detected`.
   - Switchable between file upload and manual copy-paste.
   - Sender selector displaying per-sender hourly limits.
   - Start Time (`datetime-local` picker), Delay between emails, and Hourly limit configuration.
4. **Scheduled Emails Tab:**
   - Table displaying Recipient, Subject, Sender, Scheduled Time with countdown, Status pill, and Cancel/Delete button.
   - Empty state illustration and skeleton loading animations.
5. **Sent Emails Tab:**
   - Table displaying Recipient, Subject, Sender, Sent Timestamp, Status (`Sent` / `Failed`), and clickable **"View Email"** button opening the real message on Ethereal Email.

---

## 📋 Features Checklist Mapping

| Feature Requirement | Status | Implementation Details |
|---|---|---|
| **No Cron Jobs** | ✅ Completed | BullMQ delayed jobs (`emailQueue.add` with `{ delay, jobId }`) |
| **Relational Database** | ✅ Completed | Prisma ORM with SQLite (`dev.db`) + MySQL support |
| **Persistence on Restart** | ✅ Completed | Redis Sorted Set persistence + Startup reconciliation routine |
| **Idempotency** | ✅ Completed | Deterministic job IDs (`email-${id}`) + DB state verification |
| **Worker Concurrency** | ✅ Completed | Configurable concurrency parameter in `email.worker.ts` |
| **Provider Throttling** | ✅ Completed | Configurable inter-send delay (default: 2000ms) |
| **Hourly Rate Limiting** | ✅ Completed | Redis atomic counters per sender & hour window |
| **Next-Hour Reschedule** | ✅ Completed | Auto-deferred to UTC next hour window without dropping |
| **Slack Live Alerting** | ✅ Completed | OAuth & Webhook dispatch with disconnect/reconnect resilience |
| **Elasticsearch Search** | ✅ Completed | Full-text index + multi-match query + DB fallback |
| **Live BullMQ Board** | ✅ Completed | Integrated BullBoard at `/admin/queues` |
| **Ethereal Fake SMTP** | ✅ Completed | Auto test account generation + live preview links |
| **Google OAuth Login** | ✅ Completed | Real Google login + 1-click evaluator demo account |
| **Lead File Parser** | ✅ Completed | CSV/text parser with live recipient counter badge |
| **Figma Matching UI** | ✅ Completed | ReachInbox dark theme, clean tables, modals, empty states |

---

## 🎥 5-Minute Video Demonstration Script

Follow this suggested sequence when recording your video:

1. **Overview & Architecture (0:00 - 0:45)**
   - Show the terminal with Redis running, backend server on `:5000`, and Vite on `:3000`.
   - Mention the core architecture: Express, BullMQ, Redis, Prisma, and Ethereal.
2. **Login & Dashboard (0:45 - 1:30)**
   - Open `http://localhost:3000`.
   - Sign in using the Google OAuth or Demo Evaluator button.
   - Point out the metrics cards, Scheduled/Sent tabs, and BullMQ link in the header.
3. **Scheduling Cold Email Campaign (1:30 - 2:30)**
   - Click **"Compose New Email"**.
   - Upload the included `sample-leads.csv` file; highlight the **"10 email addresses detected"** counter badge.
   - Set the delay to 2 seconds and click **"Schedule Campaign in BullMQ"**.
   - Navigate to the **Scheduled Emails** tab to show the pending jobs.
   - Open `http://localhost:5000/admin/queues` to show the jobs inside the BullMQ delayed queue.
4. **Sent Emails & Ethereal SMTP Preview (2:30 - 3:15)**
   - Watch the jobs process in real time.
   - Switch to the **Sent Emails** tab.
   - Click **"View Email"** on one of the sent rows to open the message live on Ethereal Email.
5. **Server Restart Persistence Test (3:15 - 4:00)**
   - Compose an email scheduled 2 minutes in the future.
   - Kill the backend server process in the terminal (`Ctrl+C`).
   - Show that the frontend shows the pending item.
   - Restart the server (`npm run dev:server`).
   - Highlight the startup reconciliation log: `[Startup] Reconciliation complete. Found pending emails in DB...`.
   - Show that when the countdown elapses, the email sends correctly without duplication.
6. **Rate Limiting & Live Slack Alert (4:00 - 4:45)**
   - Open the Slack modal, paste your webhook, and click **"Save & Verify Webhook"**.
   - Click **"Test Live Alert"** to show the live Slack notification appearing on your phone or Slack desktop app.
   - Show how sending beyond a sender's quota marks the email as `RATE_LIMITED` and defers it to the next hour.
7. **Wrap-Up (4:45 - 5:00)**
   - Summarize key production-grade practices: idempotency, zero cron jobs, and distributed rate limiting.

---

## 💡 Assumptions, Shortcuts & Trade-offs

1. **Database Selection:**
   - **Choice:** SQLite via Prisma (`dev.db`) is configured out of the box so anyone cloning the repository can run it immediately without entering MySQL/Postgres root passwords.
   - **Switching to MySQL:** The schema and Prisma code are fully compatible with MySQL/PostgreSQL. To switch to MySQL, update `provider = "mysql"` in `schema.prisma` and set `DATABASE_URL="mysql://user:pass@localhost:3306/reachinbox"`.
2. **Elasticsearch Fallback:**
   - While Elasticsearch is fully integrated with index mappings and multi-match fuzziness, we added an automatic fallback to database queries if an ES cluster is not running locally. This ensures seamless evaluation without requiring 2GB+ of Docker memory for an ES node.
3. **Slack OAuth vs. Webhook:**
   - We support both full Slack OAuth token exchange and standard Incoming Webhooks. Incoming Webhook setup takes 30 seconds to configure and is much easier to demo in video submissions.
