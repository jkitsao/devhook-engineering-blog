---
title: "Reactive M-Pesa Webhooks with Devhooks Sync ⚡"
excerpt: "Turn M-Pesa STK Push payloads into live event streams and push updates to your frontend instantly with Devhooks Sync."
coverImage: "/assets/blog/devhooks-sync-mpesa/flow.jpg"
date: "2025-08-25T12:00:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/devhooks-sync-mpesa/flow.jpg"
---

## Turning M-Pesa Webhooks into Real-Time Event Streams

I've been wrestling with M-Pesa STK Push webhooks for a while now. The usual pattern is frustrating: webhook hits your backend, frontend polls repeatedly, users wait and refresh pages. After dealing with this pain enough times, I built something better.

**Devhooks Sync** ingests webhooks on your behalf and converts each payload into a live event stream your frontend can subscribe to. No more polling loops or refresh buttons. Payment confirmations happen in real-time.

If you want to understand the technical implementation details, I documented the [DIY approach using Cloudflare Durable Objects here](https://blog.devhooks.live/posts/mpesa-cloudflare-durable-reactive). But I got tired of rebuilding this infrastructure for every project, so I packaged it into something reusable.

![Devhooks Dashboard Webhook Setup](/assets/blog/devhooks-sync-mpesa/flow.jpg)

## The M-Pesa Async Problem

Anyone who's used M-Pesa payments in production knows the drill. You initiate an STK push, show a loading spinner, then... wait. The webhook might arrive in 5 seconds or 60 seconds. Meanwhile, your frontend is stuck polling every few seconds asking "done yet?"

I wrote about this specific pain point in detail in [this post about reactive M-Pesa workflows](https://blog.devhooks.live/posts/reactive-mpesa-stk-webhooks), using examples from KenyaBuzz and Naivas where users end up in that familiar refresh-button dance.

The polling approach wastes resources and creates artificial delays. Even if the webhook arrives quickly, you're still bounded by your polling interval. WebSockets solve the latency but add connection management complexity that most projects don't want to deal with.

## How the Event Stream Approach Works

The architecture is straightforward:

1. **Webhook Ingestion:** Devhooks receives M-Pesa STK Push payloads from Daraja
2. **Event Broadcasting:** Each payload gets converted into an event and pushed to a dedicated stream
3. **Client Subscription:** Your frontend subscribes to the stream and receives updates immediately

It's essentially giving your frontend a direct line to M-Pesa's webhook events, without the infrastructure headaches.

![Real-Time Payment Update on Frontend](/assets/blog/devhooks-sync-mpesa/sync.png)

## Implementation: Frontend Integration

The client-side integration is deliberately minimal. I built the `@jkitsao/echo` client to handle authentication, reconnection, and message parsing automatically:

![Devhooks Sync Frontend Connection](/assets/blog/devhooks-sync-mpesa/frontend-connection.jpeg)

```javascript
"use client";

import { SyncClient } from "@jkitsao/echo";
import { useEffect, useState } from "react";

export default function PaymentPage() {
  const [paymentStatus, setPaymentStatus] = useState("pending");

  useEffect(() => {
    const client = new SyncClient({
      sourceId: "payment-flow",
      secret: process.env.NEXT_PUBLIC_DEVHOOKS_SECRET,
    });

    client.on("authenticated", () => {
      console.log("Connected to payment stream");
    });

    client.on("event", (data) => {
      if (data.type === "mpesa_callback") {
        setPaymentStatus(data.ResultCode === "0" ? "success" : "failed");
        console.log("Payment callback received:", data);
      }
    });

    client.connect();
    return () => client.disconnect();
  }, []);

  return (
    <div>
      {paymentStatus === "pending" && <p>Waiting for payment...</p>}
      {paymentStatus === "success" && <p>Payment confirmed</p>}
      {paymentStatus === "failed" && <p>Payment failed</p>}
    </div>
  );
}
```

The client handles the WebSocket connection lifecycle, authentication with the Devhooks backend, and automatic reconnection if the connection drops. You just subscribe to events and react to them.

## Why This Pattern Works

After implementing this across several projects, the benefits became clear:

**Reduced Latency:** Payment confirmations typically arrive within 1-2 seconds instead of being bounded by polling intervals (usually 3-5 seconds).

**Simpler Frontend Code:** No more `setInterval` polling logic, loading state management, or complex timeout handling. Just subscribe and react.

**Better Resource Utilization:** Eliminates constant polling requests that waste server resources and database connections.

**Reliable Event Delivery:** Built-in message acknowledgment and replay for missed events during connection drops.

The pattern scales well because each payment session gets its own event stream. Multiple users can have concurrent payments without interfering with each other.

## Technical Implementation Notes

Behind the scenes, this uses Cloudflare Durable Objects for state management and WebSocket connections for real-time delivery. The webhook ingestion endpoint is globally distributed, so M-Pesa callbacks hit the nearest edge location.

Event streams are ephemeral by default but include replay functionality for the last 24 hours. This handles cases where clients disconnect during payment processing and need to catch up on missed events.

Authentication uses short-lived tokens that auto-refresh, and the client handles token renewal transparently. Connection state is exposed through events, so you can show connection status in your UI if needed.

## Getting Started

The setup is minimal if you want to try this approach:

1. **[Grab an account](https://devhooks.live)** (free tier handles 5k events/day)
2. **Install the client:** `npm install @jkitsao/echo`
3. **[Follow the integration guide](https://docs.devhooks.live/quickstart/mpesa)**
<!-- 
The [GitHub examples repo](https://github.com/devhooks-live/examples) has working implementations for Next.js, React, and vanilla JavaScript if you want to see the full flow.

**[Documentation](https://docs.devhooks.live)** | **[Examples](https://github.com/devhooks-live/examples)** | **[Discord](https://discord.gg/devhooks)** -->

Turning webhooks into reactive streams eliminates a whole class of polling-related problems. If you're dealing with M-Pesa integration headaches, this approach might save you some time.
