---
title: "Your Daraja Webhook *Probably* Needs a Queue 📨"
excerpt: "Why your Daraja webhooks fail under load and how queues can save you from dropped events."
coverImage: "/assets/blog/daraja-queue/cover.webp"
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

```js

// queues/paymentQueue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!);

export const paymentQueue = new Queue("payment-queue", { connection });

```

```js
// routes/daraja-webhook.ts
import express from "express";
import { paymentQueue } from "../queues/paymentQueue";

const router = express.Router();

router.post("/daraja/webhook", async (req, res) => {
  try {
    // Push webhook payload into the queue
    await paymentQueue.add("process-payment", req.body);

    // Always respond quickly to Daraja
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Failed to enqueue webhook:", err);
    res.status(500).json({ status: "error" });
  }
});

export default router;
```

```js

// workers/paymentWorker.ts
import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!);

const worker = new Worker(
  "payment-queue",
  async job => {
    const payload = job.data;

    console.log("Processing payment:", payload);

    // 💡 Example: idempotency check
    const existing = await checkIfProcessed(payload.TransactionID);
    if (existing) {
      console.log("Duplicate transaction skipped:", payload.TransactionID);
      return;
    }

    await savePaymentToDB(payload);
    await sendReceiptSMS(payload);
  },
  { connection }
);

worker.on("completed", job => {
  console.log(`Payment ${job.id} processed ✅`);
});

worker.on("failed", (job, err) => {
  console.error(`Payment ${job?.id} failed ❌`, err);
});


```
