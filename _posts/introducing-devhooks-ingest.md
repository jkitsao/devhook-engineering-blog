---
title: "Introducing Devhooks 🚀"
excerpt: "Test, Debug, and Simulate Webhooks with Ease"
coverImage: "/assets/blog/dynamic-routing/cover.jpg"
date: "2025-08-23T05:35:07.322Z"
author:
  name: Jackson Kitsao.
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/dynamic-routing/cover.jpg"
---

## Building Better Webhook Infrastructure

I'm Kitsao, and I've been building [Devhooks.live](https://www.devhooks.live) to solve webhook problems I kept running into across different projects.

Over the past few years, I've found myself dealing with event-driven architectures more often than I initially planned. At [MyMovies.Africa](https://mymovies.africa), I needed real-time updates for Video encoding jobs and ended up hacking together an Event source system. Later, working at [Old Mutual](https://www.oldmutual.co.ke), I was deep in M-Pesa integrations paybills, STK push callbacks, the usual payment workflow stuff. These days, I’m working in the broader fintech and microfinance space, focusing on infrastructure, integrations, and the occasional event-driven headache.

The pattern became clear: Events/webhooks are everywhere, but the tooling around them is inconsistent and often frustrating.

## The Developer Experience Gap

Working with Daraja (M-Pesa's API) versus something like Stripe highlights this perfectly. Daraja works you get webhook notifications when transactions happen but the developer experience is pretty bare-bones. No request logs, minimal error details, and when something breaks, you're mostly debugging in the dark with cryptic JSON payloads.

Stripe spoils you in comparison. Their webhook implementation treats observability as a first-class concern: detailed dashboards, automatic retries, comprehensive event types, request/response logging. Debugging becomes straightforward instead of guesswork.

I wanted to bridge that gap keep the simplicity of getting started quickly, but add the reliability and visibility that makes webhook debugging actually manageable.

## What I'm Building

**Devhooks** addresses the specific pain points I kept hitting:

**[Devhooks Debugger](https://www.devhooks.live/)** eliminates the ngrok dance when testing webhooks locally. You get a public URL that forwards to your local development server, with request inspection built in.

**[Devhooks Ingest](https://www.devhooks.live/ingest/about)** handles the production concerns: request queuing, automatic retries with exponential backoff, payload validation, and detailed logging plus a robust Dead Letter Queue. All the infrastructure stuff you don't want to build yourself.

**[Devhooks Sync](https://www.devhooks.live/)** converts webhook events into real-time streams that your frontend can subscribe to directly. This solves the polling problem where your UI constantly asks "is the payment done yet?" Instead, payment confirmations push to your frontend the moment the webhook arrives.

<!-- You can check out the full dashboard at [devhooks.live/ingest](https://devhooks.live/ingest). -->

The SDK integration is straightforward for frameworks like Next.js. Here's how it looks for handling M-Pesa STK Express payments:

```javascript
import { SyncClient } from "@jkitsao/echo";

const client = new SyncClient({
  sourceId: "payment-handler",
  secret: process.env.DEVHOOKS_SECRET,
});

client.on("event", (data) => {
  // Payment completed, update UI immediately
  updatePaymentStatus(data.ResultCode === "0" ? "success" : "failed");
});
```

No polling intervals, no manual retry logic, no connection management. Just subscribe to the events you care about.

## Technical Architecture Notes

Under the hood, Devhooks runs on an edge infrastructure. Webhook ingestion itself is built on top of a Redis setup, which handles incoming events reliably and at low latency for example, callbacks from M-Pesa are processed close to the source.

The **real-time sync feature** uses **Cloudlare Durable Objects** for state management, enabling instant delivery of updates via WebSocket connections to subscribed clients.

Failed webhook deliveries are retried using exponential backoff with jitter, and events can be queued for up to 72 hours. Clients can also replay event streams to catch up on any missed updates.

<!-- Authentication relies on short-lived tokens that refresh automatically, so clients don’t need to manage token expiration manually. -->

## Current Status

Devhooks is in live beta and built here in Nairobi. I'm using it across my own projects and working with a few other developers who've been testing it on their webhook integrations.

The free tier covers upto 5,000,000 events per day, which handles most development and small production workloads. No credit card required to get started.

If you're dealing with webhook pain points in your projects, you might find this useful:

- **Try it:** [devhooks.live](https://devhooks.live)
- **Questions/Feedback:** kitsao@devhooks.live
- **Documentation:** Available in the dashboard after signup

I'm particularly interested in feedback from developers working on payment integrations or real-time applications. The goal is to make webhook/events infrastructure invisible so you can focus on the business logic that actually matters.

![Moringa career fair](https://api.devhooks.live/assets/6b50c958-7d1e-4e73-8fa7-b9f78e02880f?key=system-large-contain)

![Moringa career fair](https://api.devhooks.live/assets/2479cd94-6087-457e-8c53-0af4125f0140?key=system-large-contain')
