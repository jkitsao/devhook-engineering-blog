---
title: "Real-time M-Pesa STK Push with Cloudflare Durable Objects 🌩️"
excerpt: "Ditch the polling madness. Use Durable Objects and WebSockets to create truly reactive M-Pesa integrations that update instantly."
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

This approach has serious issues:

- **Wasteful**: Constant database hits even when nothing changes
- **Slow**: 2-second intervals mean users wait unnecessarily
- **Unreliable**: Easy to miss the webhook if polling stops
- **Expensive**: Database queries add up fast

## What Are Cloudflare Durable Objects?

Before diving into the solution, let's quickly understand what makes Durable Objects special.

**Durable Objects** are Cloudflare's answer to stateful serverless computing. Unlike traditional serverless functions that are stateless and ephemeral, Durable Objects provide:

- **Global Consistency**: Each object instance exists in exactly one location worldwide at any given time
- **Persistent State**: Built-in storage that survives between requests
- **WebSocket Support**: Can maintain long-lived connections
- **Automatic Migration**: Cloudflare moves objects closer to where they're being used
- **Strong Consistency**: No eventual consistency issues - reads after writes are guaranteed

Think of them as **mini-servers** that automatically scale and migrate based on usage patterns. Perfect for our payment tracking use case where we need to maintain state between the STK initiation and the webhook callback.

What really blows my mind (and Josh Howard, Senior Engineering Manager at Cloudflare, explains this beautifully) is that Durable Objects are designed to **scale out to billions**, you can literally have one per customer. And since they can **move closer to the customer** and handle requests individually, the model is insanely powerful. This isn’t just theory it’s a whole new way of thinking about distributed systems. Honestly, I really love what Cloudflare is doing here ❤️.

> 📚 **Learn More**: Check out the [Durable Objects documentation](https://developers.cloudflare.com/durable-objects/), this excellent [introductory blog post](https://blog.cloudflare.com/introducing-durable-objects/) from Cloudflare, and [this talk by Josh Howard (Senior Engineering Manager at Cloudflare)](https://www.youtube.com/watch?v=C5-741uQPVU) where he breaks it down.

## The Durable Objects Solution

With this understanding, here's how we can leverage Durable Objects to create **stateful, globally consistent** payment sessions that can hold WebSocket connections and react to webhooks instantly.

Here's the architecture:

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

## Let’s Build It Together

Before we dive into code, here’s some helpful context to get you started:

Cloudflare provides the **Wrangler CLI** to manage and deploy Durable Objects quickly, and their official documentation and GitHub examples make spinning one up a breeze.

This guide isn’t a **Durable Objects 101** instead, it’s laser-focused on how to solve a specific use case: **reliably tracking payments between the STK initiation and the webhook callback**.

If you're new to Durable Objects or want to understand the foundations, check these out:

- [Wrangler CLI; start building with ease](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Durable Objects examples on GitHub](https://github.com/cloudflare/workers-sdk/tree/main/examples)
- [🎥 Intro to Durable Objects (YouTube)](https://www.youtube.com/watch?v=qF2PuYnBahw&pp=ygUQZHVyYWJsZSBvYmplY3RzIA%3D%3D) - a clear, beginner-friendly overview
- [🎥 How Durable Objects and D1 Work: A Deep Dive with Cloudflare’s Josh Howard](https://www.youtube.com/watch?v=C5-741uQPVU) - Josh Howard, Senior Engineering Manager at Cloudflare, explains how Durable Objects (and D1) actually work under the hood.

Once you're familiar with the basics, let's jump into building our actual payment tracking solution.

### Create the Payment Durable Object

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

    // Send any existing payment data
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

    // 🚀 INSTANT notification to WebSocket client
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

## A Quick WebSockets 101

Before we write any Frontent code code, let’s take a moment to understand **what WebSockets are** and why they’re useful here.

Normally, web apps use **HTTP requests** which are **one-way**: the client asks, the server responds, and that’s it. If you need continuous updates (like tracking a payment), the client would have to keep **polling** the server over and over which is wasteful and slow.

**WebSockets change that.**  
They open up a **persistent two-way connection** between the client and server. Once connected:

- The **client** can send events anytime.
- The **server** can push messages back instantly (no polling required).

That makes them perfect for real-time experiences like:

- Chat apps 💬
- Live dashboards 📊
- Multiplayer games 🎮
- …and in our case, **payment status tracking** ⚡

So the idea is simple:

1. The client connects to a WebSocket.
2. Our Durable Object keeps track of that connection.
3. When the webhook callback arrives, the Durable Object immediately pushes the update back to the waiting client.

With that foundation in mind, let’s move on to the code. 🚀

```javascript
import React, { useState, useEffect, useRef } from "react";

// Component for handling M-Pesa payments
export default function MpesaPayment({ customerId }) {
  const [statusMessage, setStatusMessage] = useState("");

  const [paymentResponse, setPaymentResponse] = useState(null);

  // WebSocket instance (persistent across renders)
  const wsRef = useRef(null);

  //  Initiate payment
  const initiatePayment = async (phoneNumber, amount) => {
    // Create a WebSocket connection to the customer's Durable Object
    const wsUrl = `wss://your-worker.your-subdomain.workers.dev/sessions/${customerId}/websocket`;
    wsRef.current = new WebSocket(wsUrl);

    // Listen for messages from the server
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handlePaymentUpdate(message);
    };

    // Send POST request to initiate the STK push
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

  // Handle payment updates coming from WebSocket
  const handlePaymentUpdate = (message) => {
    switch (message.type) {
      case "STK_INITIATED":
        showPendingState(message.data);
        break;
      case "PAYMENT_COMPLETED":
        if (message.data.status === "SUCCESS") {
          showSuccessState(message.data);
        } else {
          showFailureState(message.data);
        }
        // Close the WebSocket after completion
        wsRef.current?.close();
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  };

  // pending payment state
  const showPendingState = (data) => {
    setStatusMessage(`📱 Check your phone for M-Pesa prompt...`);
  };

  // successful payment state
  const showSuccessState = (data) => {
    setStatusMessage(
      `✅ Payment successful! Receipt: ${data.mpesaReceiptNumber}`
    );
  };

  // failed payment state
  const showFailureState = (data) => {
    setStatusMessage(`❌ Payment failed. Reason: ${data.reason || "Unknown"}`);
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
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

This Cloudflare Worker acts as a proxy for customer-specific Durable Objects. It parses the URL to extract a customerId and forwards the request to that customer’s Durable Object instance.

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

Let me break down what this code actually accomplishes in simple terms:

**Before (The Old Way):**

- You initiate M-Pesa payment
- Your app asks the database "Is it done yet?" every 2 seconds
- Database says "Nope" 29 times
- Finally says "Yes!" on attempt 30
- User waited 60 seconds staring at a loading screen

**After (Our Durable Objects Way):**

- You initiate M-Pesa payment
- Your app opens a "direct phone line" (WebSocket) to a dedicated assistant (Durable Object)
- The assistant waits patiently for M-Pesa to call back
- M-Pesa calls with results
- Assistant immediately shouts the good news down the phone line
- User sees instant update - no waiting, no refresh button

**The Magic Ingredients:**

1. **The Personal Assistant (Durable Object)**: Each payment gets its own dedicated helper that never forgets and never goes offline
2. **The Direct Phone Line (WebSocket)**: A always-on connection between your webpage and the assistant
3. **The Callback Handler**: When M-Pesa calls back, the assistant immediately knows which payment it belongs to and who to notify

**Real-World Impact:**
Instead of your users sitting there wondering "Did my payment work? Should I try again?", they get immediate feedback. No more double payments, no more abandoned transactions, no more frustrated customers.

It's like the difference between sending a letter and waiting weeks for a reply versus having a real-time phone conversation.

## Why This Approach Rocks

**🚀 Instant Updates**: WebSocket connection means zero-latency payment status updates  
**💰 Cost Effective**: No continuous polling = fewer compute resources  
**🌍 Globally Consistent**: Durable Objects ensure the webhook always reaches the right instance  
**🔄 Automatic Cleanup**: Objects can be configured to clean up after payment completion  
**📈 Scalable**: Each customer gets their own isolated object instance

## The User Experience

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
