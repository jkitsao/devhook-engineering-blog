---
title: "Stop Polling! Make Your M-Pesa STK Push Reactive ⚡"
excerpt: "How to build a seamless STK Push experience with Daraja webhooks, WebAssembly, and sockets."
coverImage: "/assets/blog/mpesa-stk-reactive/cover.png"
date: "2025-08-23T12:15:00.000Z"
author:
  name: Jackson Kitsao
  picture: "/assets/blog/authors/profile.png"
ogImage:
  url: "/assets/blog/mpesa-stk-reactive/cover.png"
---

Most backend devs new to **Daraja** start by wiring up STK Push payments in the simplest way possible:

- Initiate a payment from the backend ✅
- Save the `MerchantRequestID` ✅
- Start **polling** the Daraja API for the transaction status ❌

This works… but it’s clunky. Polling is wasteful, brittle, and results in terrible UX. Let’s make this **reactive** instead.

---

## The Typical Polling Problem 😩

Imagine a **KenyaBuzz-like** flow:

- The user triggers a payment via STK Push
- You **immediately** show a spinner or message like _"Waiting for confirmation…"_
- In the background, you’re hitting the Daraja API every few seconds asking:  
  _“Has the payment gone through yet?”_

It looks something like this:

```ts
// ❌ Don't do this
const interval = setInterval(async () => {
  const res = await fetch(`/api/mpesa/status?merchantReqId=${merchantReqId}`);
  const { status } = await res.json();
  if (status === "COMPLETED") {
    clearInterval(interval);
    showSuccess();
  }
}, 3000);
```
