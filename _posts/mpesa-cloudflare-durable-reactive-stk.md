---
title: "Instant M-Pesa STK Payments with Cloudflare Durable Objects 🌩️"
excerpt: "Stop polling. Start streaming M-Pesa updates in real time.
."
coverImage: "/assets/blog/mpesa-cloudflare-reactive/cover.jpeg"
date: "2025-08-24T14:30:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/mpesa-cloudflare-reactive/cover.jpeg"
---

<!-- https://blog.devhooks.live/posts/reactive-mpesa-stk-webhooks -->

Remember that frustrating refresh-button dance I mentioned with the KenyaBuzz payment? [Find it here](https://blog.devhooks.live/posts/reactive-mpesa-stk-webhooks). Well, there's a **much better way** to handle M-Pesa STK Push callbacks without making your users wait in limbo.

Enter **Cloudflare Durable Objects** + **WebSockets**. This combo lets you build truly reactive payment flows that update instantly when M-Pesa hits your webhook.

## The Problem with Traditional Polling

Most developers handle STK Push like this:

```javascript
// 😰 The old way - polling hell
async function checkPaymentStatus(merchantRequestId) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getPaymentFromDB(merchantRequestId);
    if (status !== "PENDING") return status;
    await sleep(2000); // Wait 2 seconds
  }
  return "TIMEOUT";
}
```

This approach comes with several serious drawbacks. It’s **wasteful** because it keeps hitting the database even when nothing has changed. It’s also **slow** relying on fixed 2-second intervals means users end up waiting longer than necessary. On top of that, it’s **unreliable**; if polling ever stops, you could easily miss an important webhook. Finally, it’s **expensive** since all those repeated database queries add up quickly.

## What Are Cloudflare Durable Objects?

Before diving into the solution, let's quickly understand why **Cloudflare Durable Objects** are special.

Durable Objects are Cloudflare’s **stateful serverless** solution. Unlike traditional stateless functions, they let you **store and manage data right next to your compute**.

You get a **single, consistent instance of your data** anywhere in the world. State persists between requests, long-lived connections like WebSockets stay open, and **reads always reflect the latest writes**. Cloudflare even **moves your objects closer to where they're used**, so you don’t worry about eventual consistency.

Think of them as **mini-servers** that scale and migrate automatically. For our use case tracking payments between **STK initiation** and the **webhook callback** this is perfect, since we need to maintain **state** across multiple steps.

And here’s what blows my mind (Josh Howard at Cloudflare explains this beautifully): Durable Objects are built to **scale to millions**. You can literally have **one per customer**, and because they **move closer to users** and handle requests individually, the model is insanely powerful.

This isn’t just theory it’s a whole new way of thinking about distributed systems. **Honestly, I love what Cloudflare is doing here ❤️**. They’re solving hard problems elegantly, and Durable Objects are a perfect example of that.

> 📚 **Learn More**: Check out the [Durable Objects documentation](https://developers.cloudflare.com/durable-objects/), this excellent [introductory blog post](https://blog.cloudflare.com/introducing-durable-objects/) from Cloudflare, and [this interview with Josh Howard](https://www.youtube.com/watch?v=C5-741uQPVU) where he breaks it down beautifully.

---

## The Durable Objects Solution

Now that we understand why Durable Objects are so special, let’s apply them to a real-world problem: **building reactive M-Pesa STK payment tracking**.

Our goal is simple:

- Start an **STK push**
- **Track the payment status** instantly
- Update the UI in **real time** without polling, delays, or race conditions.

Here’s the architecture at a glance:

```
┌─────────────────┐    WebSocket    ┌──────────────────┐
│   Web Client    │◄───────────────►│  Durable Object  │
└─────────────────┘                 │  (per customer)  │
                                    └──────────────────┘
                                             ▲
                                             │
                                    ┌────────▼─────────┐
                                    │  M-Pesa Webhook  │
                                    └──────────────────┘
```

Durable Objects sit at the **center** of this flow:

- They **initiate STK pushes**.
- They **listen for webhook callbacks**.
- And they **push updates to the browser instantly** via WebSockets.

No polling. No delays. No missed updates.

---

## Let’s Build It Together

Before we dive into code, here’s some helpful context to get you started.

Cloudflare provides the **Wrangler CLI** to manage and deploy Durable Objects quickly, and their official docs and GitHub examples make spinning one up a breeze.

This guide isn’t a **Durable Objects 101**, it’s laser-focused on solving one problem:  
**reliably tracking payments between STK initiation and the webhook callback**.

If you’re new to Durable Objects and want to dive deeper into the foundations, check these out:

- [Wrangler CLI; start building with ease](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Durable Objects examples](https://developers.cloudflare.com/durable-objects/examples/)
- [🎥 Intro to Durable Objects (YouTube)](https://www.youtube.com/watch?v=qF2PuYnBahw&pp=ygUQZHVyYWJsZSBvYmplY3RzIA%3D%3D)
- [🎥 How Durable Objects and D1 Work: A Deep Dive with Josh Howard](https://www.youtube.com/watch?v=C5-741uQPVU)

Once you’re familiar with the basics, it’s time to put everything together and **build our payment tracking solution**.

---

### Create the Payment Durable Object

For this implementation, each Durable Object will manage a **single payment session** from start to finish.  
Think of it like a **mini-payment controller** that handles everything related to one transaction in isolation.

Here’s what it does:

- **WebSocket connections** → keeps the browser updated in **real time**.
- **STK push initiation** → starts the M-Pesa payment.
- **Webhook handling** → processes Daraja callbacks and instantly notifies the client.

The beauty of Durable Objects here is that we don’t need to glue together multiple services or store session state elsewhere.  
Everything; **storage, WebSockets, and API endpoints** lives in one isolated instance **per customer**. That’s exactly what makes this approach elegant and reactive.

Here’s the Durable Object implementation:

```typescript
export class PaymentSession {
  private webSocket: WebSocket | null = null;
  private paymentData: any = null;

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/webhook" && request.method === "POST") {
      return this.handleWebhook(request);
    }

    if (url.pathname === "/initiate" && request.method === "POST") {
      return this.initiateStkPush(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.webSocket = server;

    server.accept();

    // Send any existing payment data to the client immediately
    if (this.paymentData) {
      server.send(
        JSON.stringify({
          type: "PAYMENT_UPDATE",
          data: this.paymentData,
        })
      );
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async initiateStkPush(request: Request): Promise<Response> {
    const { phoneNumber, amount, accountReference } = await request.json();

    // Make STK Push request to M-Pesa
    const stkResponse = await this.makeStkPushRequest({
      phoneNumber,
      amount,
      accountReference,
    });

    // Store the merchant request ID for webhook matching
    await this.state.storage.put(
      "merchantRequestId",
      stkResponse.MerchantRequestID
    );
    await this.state.storage.put(
      "checkoutRequestId",
      stkResponse.CheckoutRequestID
    );

    this.paymentData = {
      status: "PENDING",
      merchantRequestId: stkResponse.MerchantRequestID,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      timestamp: new Date().toISOString(),
    };

    // Notify connected WebSocket immediately
    if (this.webSocket) {
      this.webSocket.send(
        JSON.stringify({
          type: "STK_INITIATED",
          data: this.paymentData,
        })
      );
    }

    return Response.json(this.paymentData);
  }

  private async handleWebhook(request: Request): Promise<Response> {
    const webhookData = await request.json();

    // Extract the merchant request ID from webhook
    const merchantRequestId = webhookData.Body?.stkCallback?.MerchantRequestID;
    const storedMerchantId = await this.state.storage.get("merchantRequestId");

    // Verify this webhook belongs to this session
    if (merchantRequestId !== storedMerchantId) {
      return new Response("Invalid merchant request ID", { status: 400 });
    }

    // Process the payment result
    const resultCode = webhookData.Body?.stkCallback?.ResultCode;
    const paymentStatus = resultCode === 0 ? "SUCCESS" : "FAILED";

    this.paymentData = {
      ...this.paymentData,
      status: paymentStatus,
      resultCode,
      resultDesc: webhookData.Body?.stkCallback?.ResultDesc,
      mpesaReceiptNumber: this.extractReceiptNumber(webhookData),
      completedAt: new Date().toISOString(),
    };

    // 🚀 Instant notification to WebSocket client
    if (this.webSocket) {
      this.webSocket.send(
        JSON.stringify({
          type: "PAYMENT_COMPLETED",
          data: this.paymentData,
        })
      );
    }

    // Persist to your main database if needed
    await this.persistToDatabase(this.paymentData);

    return Response.json({ status: "OK" });
  }

  private async makeStkPushRequest(params: any) {
    // Your existing STK Push implementation
    // Return the M-Pesa API response
  }

  private extractReceiptNumber(webhookData: any): string | null {
    const items = webhookData.Body?.stkCallback?.CallbackMetadata?.Item || [];
    const receiptItem = items.find(
      (item: any) => item.Name === "MpesaReceiptNumber"
    );
    return receiptItem?.Value || null;
  }
}
```

## Preparing for WebSockets in the Frontend

With the Durable Object ready, the next step is wiring up the **frontend** so we can receive **real-time payment updates**.  
This is where **WebSockets** come in.

Unlike regular HTTP requests, WebSockets keep a **persistent two-way connection** open between the browser and the Durable Object. That means the moment M-Pesa sends a payment update, your UI reacts instantly — no polling, no delays.

Here’s the flow:

1. The client connects to the session’s WebSocket.
2. The Durable Object tracks that connection.
3. Whenever a payment status changes, the Durable Object **pushes** the update to the client immediately.

If you’re new to WebSockets, [MDN’s guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) has a great primer but let’s dive straight into the code.

```javascript
import React, { useState, useEffect, useRef } from "react";

export default function MpesaPayment({ customerId }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentResponse, setPaymentResponse] = useState(null);
  const wsRef = useRef(null); // persistent WebSocket

  const initiatePayment = async (phoneNumber, amount) => {
    // Connect to the Durable Object WebSocket
    const wsUrl = `wss://your-worker.your-subdomain.workers.dev/sessions/${customerId}/websocket`;
    wsRef.current = new WebSocket(wsUrl);

    // Listen for real-time updates
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handlePaymentUpdate(message);
    };

    // Start the STK Push request
    const response = await fetch(`/sessions/${customerId}/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber,
        amount,
        accountReference: "ORDER123",
      }),
    });

    const data = await response.json();
    setPaymentResponse(data);
    return data;
  };

  const handlePaymentUpdate = (message) => {
    switch (message.type) {
      case "STK_INITIATED":
        setStatusMessage("📱 Check your phone for the M-Pesa prompt...");
        break;
      case "PAYMENT_COMPLETED":
        if (message.data.status === "SUCCESS") {
          setStatusMessage(
            `✅ Payment successful! Receipt: ${message.data.mpesaReceiptNumber}`
          );
        } else {
          setStatusMessage(
            `❌ Payment failed. Reason: ${message.data.reason || "Unknown"}`
          );
        }
        wsRef.current?.close();
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  };

  // Clean up the WebSocket on unmount
  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  return (
    <div>
      <h2>M-Pesa Payment</h2>
      <button onClick={() => initiatePayment("254712345678", 100)}>
        Pay 100 KES
      </button>
      <div id="payment-status" style={{ marginTop: "1em" }}>
        {statusMessage}
      </div>
      {paymentResponse && <pre>{JSON.stringify(paymentResponse, null, 2)}</pre>}
    </div>
  );
}
```

### Worker Routing

Finally, the Cloudflare Worker routes each request to the correct customer-specific Durable Object.
It parses the customerId from the URL and forwards the request

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/sessions\/([^\/]+)(.*)$/);

    if (pathMatch) {
      const [, customerId, subPath] = pathMatch;

      // Get the Durable Object for this customer
      const id = env.PAYMENT_SESSIONS.idFromString(customerId);
      const obj = env.PAYMENT_SESSIONS.get(id);

      // Forward the request with the subPath
      const newUrl = new URL(request.url);
      newUrl.pathname = subPath || "/";

      return obj.fetch(new Request(newUrl, request));
    }

    return new Response("Not found", { status: 404 });
  },
};
```

## What We Just Built (In Plain English)

Here’s what this code actually accomplishes in simple terms:

**Before (The Old Way):**

- You initiate a Safaricom M-Pesa payment.
- Your app asks the database "Is it done yet?" every 2 seconds.
- The database says "Nope" 29 times.
- Finally says "Yes!" on attempt 30.
- User waits a whole minute staring at a spinning loading screen.

**After (Our Durable Objects Way):**

- You initiate a Safaricom M-Pesa payment.
- Your app opens a "direct phone line" (WebSocket) to a dedicated assistant (Durable Object).
- The assistant waits patiently for M-Pesa to call back.
- M-Pesa calls with the transaction results.
- The assistant immediately sends the update down the line.
- User sees instant confirmation, no waiting, no refresh button.

**The Magic Ingredients:**

1. **The Personal Assistant (Durable Object):** Each payment gets its own helper that never forgets and never goes offline.
2. **The Direct Phone Line (WebSocket):** An always-on connection between your webpage and the assistant.
3. **The Callback Handler:** When M-Pesa calls back, the assistant immediately knows which payment it belongs to and who to notify.

**Real-World Impact:**

Instead of users sitting there wondering "Did my payment go through? Should I try again?", they get immediate feedback. No more double payments, no more abandoned transactions, no more frustrated customers.

It’s like the difference between sending a courier with a letter and waiting a week versus chatting directly on WhatsApp; instant, real-time, and reliable.

## The New User Experience

With this setup, your payment flow becomes:

1. User clicks "Pay with M-Pesa"
2. WebSocket connects instantly
3. STK push sent, user sees "Check your phone..."
4. User completes payment on phone
5. **BOOM** ⚡ - Page updates immediately without any refresh

No more refresh button dance. No more "did my payment go through?" anxiety.

## Webhook URL Configuration

Configure your M-Pesa callback URL as:

```
https://your-worker.your-subdomain.workers.dev/sessions/{CUSTOMER_ID}/webhook
```

The `{CUSTOMER_ID}` should be dynamically generated for each payment session.

---

This pattern transforms the traditionally clunky M-Pesa integration into a smooth, modern payment experience. Your users will thank you for it!

Next up, I'll cover how to handle **connection failures** and **webhook retries** to make this bulletproof. Stay tuned! 🛡️
