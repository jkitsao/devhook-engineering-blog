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

### Hey, I’m Kitsao 👋

I’m building **Devhooks**, a simpler, smarter way to work with webhooks and real-time events.

Over the past few years, I’ve worked on multiple projects where webhooks played a huge role, from payments and notifications to integrations with third-party APIs. Debugging and testing them, however, has always been… painful.

I’ve kind of found myself working around event-driven systems for most of my career without really planning it. At [MyMovies.Africa](https://mymovies.africa), I built a video encoding pipeline and hacked together a webhook system so we could push out real-time updates on encoding jobs. Later, at [Old Mutual](https://www.oldmutual.co.ke), I was deep into M-Pesa integrations, wiring up paybills and all sorts of payment workflows using webhooks. These days, I’m consulting on microfinance integrations with Apache Fineract and somehow, I’m back where I started—building around events and webhooks again.

### What Stripe Gets That Daraja Misses

If you’ve ever worked with payments in Kenya, Daraja almost always shows up. It gets the job done; you get your webhook notifications when a transaction happens, but it feels pretty barebones. There’s no easy way to see what’s happening, no detailed logs, and if something breaks, you’re mostly on your own. I’ve spent hours digging through random payloads just trying to figure out what went wrong.

Stripe, on the other hand, spoils you. Webhooks are a first-class feature there. You get dashboards, retries, detailed event types, even a timeline of everything that happened. Debugging is almost fun.

That gap has been a big influence on how I think about Devhooks. I want it to have the simplicity of Daraja, quick to set up with no extra fluff, but also the reliability and observability that Stripe nails. Something that makes working with webhooks less painful and way more predictable for developers here.

### Devhooks in Action

With **Devhooks**, you don’t need to worry about building or managing complex infrastructure for webhooks. The **Devhooks Debugger** lets you inspect and test webhooks without needing tools like ngrok. Meanwhile, **Devhooks Ingest** handles observability, scaling, queues, and retries for you, all in a clean, intuitive dashboard. You can explore it here: [devhooks.live/ingest](https://devhooks.live/ingest).

One of the standout features is **Devhooks Sync**, which turns your webhook events into real-time streams. Using a simple SDK, you can surface these events directly in your apps, for example, in a **Next.js** application. This makes it easy to build real-time experiences, like handling M-Pesa **STK Express** payments, without worrying about the underlying plumbing.

---

## Try Devhooks Today

If you enjoyed this post, you can explore **[Devhooks](https://devhooks.live)** our free, live beta built right here in Nairobi. Devhooks makes working with webhooks and real-time events simple, reliable, and developer-friendly.

- **Live Beta:** [devhooks.live](https://devhooks.live)
- **Contact / Feedback:** kitsao@devhooks.live

I’d really appreciate your thoughts and feedback, this is my passion project, built to make developer workflows smoother and more predictable. Your input helps shape Devhooks into a tool that truly serves the community.
