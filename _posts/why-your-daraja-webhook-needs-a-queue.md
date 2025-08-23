---
title: "Your Daraja Webhook *Probably* Needs a Queue 📨"
excerpt: "Why your Daraja webhooks fail under load and how queues can save you from dropped events."
coverImage: "/assets/blog/daraja-webhook-queue/cover.jpg"
date: "2025-08-23T13:00:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/daraja-queue/cover.webp"
---

### Tired of dropped M-Pesa webhooks? Let’s talk queues.

If you've ever integrated **Safaricom Daraja** for M-Pesa payments, you probably know the pain:  
transactions succeed, but sometimes… your webhook **never sees them**.  
Or worse — it sees them **twice**.

This isn’t your fault. It’s how Daraja works.

---

## Why webhooks fail (and retry)

Daraja sends webhooks **once** to the URL you configured. If your server is slow, busy, or crashes at the wrong moment, that callback is **lost forever**.

But here’s the twist: sometimes Daraja **retries** — and now your API processes the **same payment twice**. Without protection, you’re stuck debugging ghost transactions.

---

## The fix: introduce a queue

Instead of doing **everything** inside the webhook handler, the smarter approach is:

1. **Receive** the webhook event quickly.
2. **Push** it into a **queue**.
3. **Acknowledge** Daraja immediately (fast response).
4. **Process** the event in the background, safely and reliably.

This pattern solves two problems:

- ✅ Prevents dropped webhooks
- ✅ Handles retries gracefully

---

## Using BullMQ with Node.js 🐂

Let’s use [BullMQ](https://docs.bullmq.io/) — a fast and reliable Redis-based queue — to make our webhook integration bulletproof.

### 1. Install dependencies

```bash
npm install bullmq ioredis express
```
