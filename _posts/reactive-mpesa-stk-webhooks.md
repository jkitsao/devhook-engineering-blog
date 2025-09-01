---
title: "Make Your M-Pesa STK Push Integrations Reactive⚡"
excerpt: "How to build a seamless STK Push experience with Daraja webhooks, and sockets."
coverImage: "/assets/blog/mpesa-stk-reactive/cover.jpg"
date: "2025-08-23T12:15:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/mpesa-stk-reactive/cover.jpg"
---

A while back, I was buying tickets to _Fantastic Four_ on [**KenyaBuzz**](https://www.kenyabuzz.com/). You know the drill, pick the seats, confirm, hit pay, STK prompt pops up. I complete the payment… and then? Nothing.  
I had to **manually press the refresh button** just to see if my payment had gone through.

This isn’t just a [KenyaBuzz](https://www.kenyabuzz.com/) thing either, most Kenyan platforms that use **M-Pesa STK Push** do the same.  
Some even add **background polling** to make it feel smoother, but that’s just the backend repeatedly hammering Daraja’s API until the status changes. It works, but:

- It’s wasteful —> constant calls for no reason.
- It’s slow —> the frontend still lags behind the real payment event.
- It’s fragile —> if the polling misses a state or fails, the UI stays stuck.

And this doesn’t just happen online.

---

### The Same Problem at Naivas... 🛒

If you’ve paid via M-Pesa at a **Naivas** or **Quickmart** checkout, you’ve probably seen this too.  
You complete the STK payment on your phone, but the cashier keeps **smashing the refresh key** on their POS terminal, waiting for the payment status to update. Sometimes it takes seconds, sometimes minutes, and when the network is slow, it’s even worse.

This kind of **manual refreshing** is just a symptom of the same deeper problem, we’re **not listening to the events in real-time**.

---

### How Daraja STK Push Works ⚙️

To understand why this happens, let’s quickly walk through what happens under the hood when you initiate an **M-Pesa STK Push** via **Safaricom Daraja**:

#### **You Make the STK Push Request**

Your backend calls Daraja’s STK Push API:

```json
POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest

{
  "BusinessShortCode": "123456",
  "Password": "base64(ShortCode+PassKey+Timestamp)",
  "Timestamp": "20230824110530",
  "TransactionType": "CustomerPayBillOnline",
  "Amount": "900",
  "PartyA": "254712345678",
  "PartyB": "123456",
  "PhoneNumber": "254712345678",
  "CallBackURL": "https://api.kenyabuzz.com/webhook",
  "AccountReference": "TICKET123",
  "TransactionDesc": "Fantastic Four"
}

```

#### **Daraja Responds Immediately**

Daraja responds with something like this:

```json
{
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_270720231011020123",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

This **does not** mean the payment succeeded, it just means the STK prompt was sent to the customer.

#### **The Customer Completes the STK Prompt**

The customer approves or cancels the payment on their phone.

---

#### **Daraja Sends a Webhook Callback**

Once the payment is processed, Daraja calls your **callback URL** (as you provided in the request) with the payment result:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_270720231011020123",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 500 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "Balance" },
          { "Name": "TransactionDate", "Value": 20230824110635 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

If you're **polling**, you keep hitting Daraja until this callback data is ready, which is why users end up smashing refresh buttons.

### Enter WebSockets: Real-Time Payments 🚀

Here's the better way:

1.  When you initiate the STK Push, **store the `MerchantRequestID`** from Daraja.
2.  The backend listens for Daraja's **callback webhook**.
3.  When the webhook arrives, **match the `MerchantRequestID`** to the one stored.
4.  Broadcast the result via **WebSockets** to the frontend or POS terminal.
5.  The UI updates instantly no refresh, no polling, no "try again later."

I've written about two solid implementations for this:

- **Using [Devhooks Sync](https://blog.devhooks.live/posts/real-time-mpesa-webhooks-devhooks-sync)**: Devhooks provides a **built-in WebSocket sync feature** that lets your app **subscribe to webhook events** in real-time without writing extra infra. As soon as Daraja sends a callback, your frontend gets the update instantly.
- **Using [Cloudflare Durable Objects](https://blog.devhooks.live/posts/mpesa-cloudflare-durable-reactive-stk)**: A more DIY approach where each customer session gets its **own WebSocket-backed Durable Object**. When the webhook arrives, the Durable Object relays the update directly to connected clients.

This is essentially what **Paystack**'s React components already do, you initiate a payment, and as soon as the backend gets the webhook, the SDK **relays the status in real-time** to your app. The UX is buttery smooth… now imagine that across every Kenyan e-commerce site or POS terminal.

---

### Why This Matters for STK Push

For users, waiting in the dark after paying sucks.  
For cashiers, smashing refresh keys feels broken.  
For developers, polling APIs feels like a hack.

By making STK Push integrations **reactive**, you:

- **Improve UX** → real-time updates without refreshing.
- **Reduce server load** → no need to keep polling Daraja.
- **Make the system more reliable** → your UI reflects the true webhook state.

---

### Edge Cases on Mobile 📱

Of course, it’s not perfect. Mobile connections can drop, WebSocket connections can fail, and you still need fallback logic, but I’ll dive into handling those edge cases in a follow-up post.

---
