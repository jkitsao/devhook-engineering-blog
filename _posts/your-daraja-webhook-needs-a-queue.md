---
title: "Why Your M-Pesa Webhook Needs a Queue System 📨"
excerpt: "How queues can save you from dropped events."
coverImage: "/assets/blog/daraja-queue/cover.jpg"
date: "2025-08-23T13:00:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/daraja-queue/cover.jpg"
---

### Tired of dropped M-Pesa webhooks? Let’s talk queues.

If you've ever integrated **Safaricom Daraja** for M-Pesa payments, you know the pain:  
transactions succeed, but sometimes… your webhook **never sees them**.  
Or worse, it sees them **twice**.

This isn’t your fault. It’s how Daraja works.

---

## Why webhooks fail (and retry)

Daraja sends webhooks **once** to the URL you configured. If your server is slow, busy, or crashes at the wrong moment, that callback is **lost forever**.

But here’s the kicker: sometimes Daraja **retries** and now your API processes the **same payment twice**. Without protection, you’re left debugging ghost transactions and reconciling duplicate entries.

---

## The fix: introduce a queue

Instead of cramming **all your payment logic** inside the webhook handler, here’s the smarter way:

1. **Receive** the webhook event.
2. **Push** it into a **queue**.
3. **Acknowledge** Daraja instantly.
4. **Process** the event in the background safely and reliably.

This pattern solves two key problems:

- ✅ **Prevents dropped webhooks** —> you respond fast, even if processing is heavy.
- ✅ **Handles retries gracefully** —> idempotency checks make duplicate requests harmless.

---

<!-- ## Using BullMQ with Node.js 🐂

Let’s set up [BullMQ](https://docs.bullmq.io/) — a reliable Redis-based queue — to make your webhook integration bulletproof.

### 1. Install dependencies

```bash
npm install bullmq ioredis express
``` -->
