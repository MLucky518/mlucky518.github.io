---
layout: post
title: "Vibe Coding: Not the Vibe You Think It Is"
date: 2025-12-05 12:00:00 -0500
categories: [technology, ai]
tags: [ai, coding, software-development, ethics, vibe-coding]
excerpt: "What happens when people begin to ship software they don't understand? A deep dive into the promises and perils of AI-assisted development."
---

Picture this. A job where a person in charge never gets their hands on the actual work. A manager sits in a comfortable chair, broadly describing ideas while a team that is unseen works tirelessly to turn those ideas into reality. If something is a bit off, well then the instructions change. If the goal happens to shift for any reason, well then the team shifts with it too.

While this may sound like a day in the life of a CEO or high level executive, it also now describes the day in the life of an average programmer sitting at their desk with multiple autonomous AI "agents" running and completing tasks for them. The AI models of today are able to write, refactor and even plan out entire software features from just a few short sentences of instruction, making them a powerful tool for developers and non-developers alike.

This kind of power in the hands of everyone raises some important questions. **What happens when people begin to ship software they don't understand?**

## The Rise of Vibe Coding

Vibe coding, which is the practice of delegating most of the coding tasks to AI agents and rapidly iterating on the outputs, has become a fast track for people with little experience to turn their ideas into reality. While this type of approach may be sufficient for small pet projects and low stakes software, treating it as a replacement for actual human developers working on real world systems is dangerous. It encourages shallow understanding of what is being built, does not emphasize security concerns, and introduces confusion about who is actually responsible when something goes wrong.

## Why Is This a Problem?

One only needs to look at how rapidly AI tools are evolving, going from a useful side tool in aiding with human code development to an integral part of software development as a whole. Tech journalist Matt O'Brien reports that the selling of tools that write code has become one of the hottest markets in the entire industry, with both large companies and startups vying to offer up the most valuable coding agents.

He explains that for many organizations, coding has become the "top use case" for most of these models due to the fact that they are able to handle a large amount of tedious work that would usually slow developers down. This may sound harmless at first and even useful, but it actually quietly shifts the core of software projects.

> With these tools taking on more and more of an essential role in projects, the incentive to rely on them grows. The more that teams depend on the agents to do their work, the easier it becomes to grow complacent and stop paying attention to what the code is actually doing.

This makes it risky in real world production systems.

## A Cautionary Tale: The Tea App Breach

The dangers of this type of complacency clearly show up when looking at the fragility in many modern applications. In *"When Apps Leak Our Data, Who Is Responsible?"* on Washingtonpost.com, internet culture reporter Tatum Hunter talks about the Tea Dating Advice App. The app, which ironically marketed itself as a safety tool for women, ended up exposing selfies, government IDs, locations, and even direct messages after a hack.

At the onset, Tea looked both professional and polished, but an exposed database made it easy for bad actors to collect sensitive information and then use it to harass and endanger users of the app. Unfortunately, situations such as this one show what can happen when development teams ship software that looks good on the surface, but without any real attention to security or best practice.

As these tools continue to make it easier for anyone to spin up a quick app, and the allure of software development is increasingly lost, the temptation to focus more on appearance and features over security and best practice only grows. **The idea of vibe coding encourages people to ship code they don't understand and with that only increases the chances of the next "safety" app putting its users at risk.**

## The Case for AI-Assisted Development (Done Right)

Not all is lost, and by no means does this mean that using AI coding agents in the development process is a bad idea. In fact, when paired with real world expertise and professional responsibility, they can actually make good engineers better.

Cat Wu, the project manager for Anthropic, the company behind the popular coding assistant Claude, notes that with these tools:

> "You're no longer in the nitty-gritty syntax... developers are more trying to communicate this higher-level goal of what you want to accomplish."

While O'Brien also notes that some people have actually misunderstood vibe coding as an avenue for non-technical individuals to be responsible for shipping business ready software, Gartner analyst Philip Walsh pushes back on the idea. Walsh states that despite all of the hype, the code that is generated by these tools still falls short in quality, scalability, robustness and security, and that they would be mostly beneficial to highly skilled professionals who already know what good code looks like.

This is a growing sentiment in the industry and paints a picture of how some professionals feel about these tools.

## The Other Side of the Coin

There are some people, both professionals and non-professionals, who actually support this new way of development and see it in an entirely different light. Instead of harping on the potential risks, they focus on how these AI agents can open doors for people who may have good ideas but lack formal training or experience.

According to O'Brien, some platforms such as the AI site building tool Lovable, now invite users to *"create apps and websites by chatting with AI"*, which makes software development feel less like a specialized skill and more like something anyone can try.

For those that live outside of the tech world the promise of this is appealing:
- Lowering the traditional barriers of entry
- Allowing small teams the ability to iterate rapidly
- Helping beginners with tailored learning

These positives extend to experienced developers as well. Staunch defenders of vibe coding continually point out that offloading tasks that are repetitive can reduce burnout and allow skilled developers to focus on higher level architectural decisions. When viewed from this perspective, vibe coding is a dream, allowing more people the chance to build tools and solve problems with code while at the same time not replacing the experienced developers in the workforce.

## The Bottom Line

The promise of vibe coding is tempting. It can make almost anyone feel like that manager in the comfortable chair, giving those broad directions to an invisible team. It's a powerful feeling to be able to describe an idea and watch your personal army of agents generate complete files and build software without ever needing to know HOW it works.

But if anything, the Tea app data breach—which is one in the sea of many disastrous failures—should teach a valuable lesson in the dangers of shipping code that isn't written or understood by a human first.

**Real client facing software isn't some tech demo.** It's in production, holding on to a user's valuable data, photos, locations, and even paychecks.

This isn't about building and keeping up knowledge silos where only elite engineers are allowed to work on code. It's about making sure that when real users and real data are involved, that someone who understands the code and can take accountability for it is present.

For many, vibe coding is indeed a vibe, but when it comes to real life production software, **it's not the vibe you think it is.**

---

## Works Cited

Hunter, Tatum. "When apps leak our data, who is responsible?" *Washingtonpost.com*, 7 Aug. 2025. Gale In Context: Opposing Viewpoints.

O'Brien, Matt. "AI is transforming how software engineers do their jobs. Just don't call it 'vibe-coding'." *AP Online*, 29 Sept. 2025. Gale In Context: Opposing Viewpoints.
