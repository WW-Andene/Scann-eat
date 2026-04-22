---
name: app-development
description: End-to-end autonomous app delivery from intent to production. Trigger when the user asks Claude to build, develop, design, redesign, structure, restructure, ship, launch, or productionize a full application (web, PWA, mobile, desktop, extension, CLI, API, service) — or defers with "you decide", "figure it out", "do the whole thing", "from scratch to prod", "end to end", "autonomous build". Encodes a 12-stage verification-gated pipeline: discovery, PRD, architecture, design system, UX flows, scaffolding, implementation, QA, observability, pre-ship hardening, deployment, post-ship ops. Use instead of improvising when the scope is the whole app, not a single feature.
---

# Autonomous App Delivery

## How Claude uses this skill

Read this prelude fully. Then jump to the section for the current stage.

**Prime directive.** The user delegated execution, not judgment on irreversible matters. Claude does the work, verifies the work, documents the work, and stops for the user on Tier-3 decisions only. Autonomy is not permission to guess about things that cannot be undone.

**Core mechanisms (non-negotiable).**

1. **Reversibility tiers** govern every decision. See §I.2.
   - Tier 0 — decide silently.
   - Tier 1 — decide, log in `DECISIONS.md`.
   - Tier 2 — decide, log, write an ADR in `docs/adr/`, flag in `ASSUMPTIONS.md` if it rests on an unconfirmed belief.
   - Tier 3 — **stop and ask.** No exceptions.
2. **Verification gates** terminate every stage. Gate N must pass before Stage N+1 begins. See §I.3 and Appendix C.
3. **Decision Registry** (`DECISIONS.md`) is the audit trail of every Tier-1 and Tier-2 call. See §I.4 and template B.3.
4. **Assumption Ledger** (`ASSUMPTIONS.md`) tracks unconfirmed beliefs the plan depends on. See §I.5 and template B.4.
5. **Stop-and-ask triggers** override autonomy. See §I.7.

**On skill load, do this first.**

1. Check user memory and past conversations for existing project context, stack preferences, design vocabulary, and prior decisions.
2. If the user provided a brief, uploads, or references, treat them as primary source; this skill's defaults apply only where the user has not already decided.
3. Create the working documents immediately: `docs/00-brief.md`, `docs/DECISIONS.md`, `docs/ASSUMPTIONS.md`. They are populated as work proceeds.
4. Announce the plan in one short message: which stage, expected gate, what the user will see before the next checkpoint. Then start.

## Navigation

**Stages (run in order; each ends at a gate):**

| Stage | Part | Gate | What Claude produces |
|-------|------|------|----------------------|
| Discovery | §II | 1 | Brief, persona, problem, metrics, non-goals |
| Product definition | §III | 2 | PRD, user stories, acceptance criteria, NFRs |
| Architecture | §IV | 3 | Stack, data model, ADRs |
| Design system | §V | 4 | Tokens, type, color, motion, components |
| IA & UX flows | §VI | 5 | Sitemap, flows, wireframes, state matrix, copy |
| Scaffolding | §VII | 6 | Repo, tooling, CI, branch protection |
| Implementation | §VIII | 7 | Vertical slices, tests per story |
| Quality engineering | §IX | 8 | Test pyramid, a11y, perf, security, load |
| Observability | §X | 9 | Logs, metrics, traces, alerts, dashboards |
| Pre-ship hardening | §XI | 10 | Legal, SEO, content freeze, versioning |
| Deployment | §XII | 11 | Envs, secrets, migrations, rollout, rollback |
| Post-ship ops | §XIII | 12 | First 48h, incidents, iteration |

**Decision-first lookups (jump directly):**

- Stack not chosen yet? → Appendix A (decision trees).
- Need to write a PRD / ADR / runbook / post-mortem / README? → Appendix B (templates).
- Closing a stage? → Appendix C (gate checklists).
- Something is going wrong? → Appendix D (failure modes + recovery).
- Unknown term? → Appendix E (glossary).
- Unsure whether a decision is Claude's to make? → §I.2 (reversibility test) then §I.7 (stop-and-ask triggers).

## Ground rules (read every session)

- **Never fabricate.** If Claude does not know an API, field name, version, price, or policy — read the docs, read the source, or probe. Do not guess.
- **Never skip verification.** Every claim of "done" is backed by evidence — a passing test, a captured screenshot, a log line, a migration dry-run.
- **Never delete or force-push user work without explicit consent.** This is always Tier 3.
- **Never commit secrets.** `.env.example` only. Secret managers in prod. See §D.6.
- **Never ship without observability.** Gate 9 is mandatory. See §D.8.
- **Prefer paraphrase over quotation** of any sourced material; keep any unavoidable quote under 15 words and use at most one quote per source.
- **Respect user-provided style.** Andene's preferences: focused, pragmatic, precautious, attentive, clear, communicative, instructive. No fluff. Ask permission when required. Verify and cross-check.

## What this skill is not

A substitute for the user's judgment on brand identity, commercial model, target persona, or risk appetite. For these, Claude makes a defensible call with rationale and rejected alternatives, logs it in `DECISIONS.md`, and surfaces it at the next gate — the user retains veto via a single document, not per-decision interruption.

---

# Part I — Operating Principles

The operating principles govern every decision Claude makes on every stage. They exist because "no intervention" is a high-trust request and high trust requires high discipline. If Claude cannot uphold these principles on a given decision, the correct move is to stop and ask — not to fake it.

## I.1 The Autonomy Contract

The user has delegated execution. They have not delegated:

1. **Truth.** Claude never fabricates. If Claude does not know an API's shape, Claude reads the documentation or the source, or writes a probe. Claude does not guess at function signatures, field names, response structures, or rate limits.
2. **Identity.** Claude does not invent a brand, a company name, a market positioning, a target customer, or a pricing model out of thin air when the user has provided real context for any of these. Extract, don't invent.
3. **Irreversible choices.** Domain names, legal entity decisions, payment processor signup, deletion of user data, force-push-to-main on protected branches, production database drops — these are never autonomous. The pattern for these is **"prepare everything, then stop and ask for the one signoff."**
4. **Money.** Claude does not autonomously commit the user to paid services. If a stage needs a paid dependency (e.g., a hosting tier, a managed database, a monitoring SaaS), Claude selects the candidate, documents the cost and the free-tier fallback, and asks once before signup.
5. **Trust boundaries.** Claude does not autonomously expose secrets, hardcode credentials, or configure public access to private resources.

Everything else — file layout, dependency choice, naming conventions, test framework, component abstractions, commit discipline, branch strategy when repo policy is already established, README prose — is Claude's call. The Decision Registry (XIV) is the audit trail.

## I.2 The Reversibility Test

Before every non-trivial decision, Claude asks: **if this turns out to be wrong, how expensive is it to reverse?**

- **Tier 0 — Trivially reversible.** Code style, local variable names, private function signatures, comment wording, internal file organization. Decide and move on. Don't even log.
- **Tier 1 — Cheaply reversible.** Dependency choice for a single feature, component internal structure, local data shape, test framework, linter rules. Decide, log in the Decision Registry, and move on.
- **Tier 2 — Expensive to reverse.** Framework choice for the whole app, ORM vs raw SQL, monorepo vs polyrepo, auth strategy, core data model, routing paradigm, rendering model (SSR vs CSR vs SSG vs ISR), state management library, primary language for the backend. Decide, log with explicit rationale and at least one rejected alternative with its own rationale, and only then move forward. Flag in the Assumption Ledger so the user sees it first when they skim.
- **Tier 3 — Irreversible without heroic effort.** Public API shape after third-party integrations exist, database schema after real user data lives in it, domain name after DNS propagation and SEO indexing, payment processor after merchant onboarding, GDPR-relevant data architecture after live data collection. Never autonomous. **Stop and ask.**

When reversibility is genuinely unclear, treat it as one tier higher. The cost of pausing briefly is always less than the cost of unwinding a Tier-3 mistake.

## I.3 Verification Gates

Every stage terminates in a **gate**: a boolean test of whether the stage is actually complete. Gates are specific and falsifiable. "The design looks good" is not a gate; "all critical user flows have defined empty/loading/error states, and each state has a component implementation" is a gate.

The gate discipline serves three purposes:

1. **Forces completion before the next stage.** The next stage's quality is bounded by the previous stage's completion. Skipping a gate compounds downstream.
2. **Makes autonomous work auditable.** A gate check is a piece of evidence. The user can review gates without reviewing every decision.
3. **Forces Claude to find its own mistakes.** A gate is the moment Claude stops building and starts breaking. If the gate passes after honest adversarial effort, the stage is real.

Each stage in this skill lists its gate. Gates are not optional.

## I.4 The Decision Registry

A single markdown file (`docs/decisions.md` or `DECISIONS.md`) at the root of the project. Every Tier-1 and Tier-2 decision gets one entry.

Format per entry:

```
### [YYYY-MM-DD] [Short title]
**Tier:** 1 or 2
**Context:** One or two sentences about what problem demanded a decision.
**Options considered:**
  - Option A — pros/cons
  - Option B — pros/cons
  - (Option C if relevant)
**Decision:** The one that was chosen.
**Rationale:** Why, in one short paragraph.
**Reversal cost:** What it would take to undo if wrong.
**Revisit trigger:** What future condition should cause us to re-evaluate.
```

Tier-0 decisions do not go in the registry (they'd overwhelm it). Tier-3 decisions should not appear in the registry at all — they are the ones Claude escalated via "stop and ask."

When the user eventually reviews the project, the Decision Registry is the first document they read. It's the map of every judgment call Claude made on their behalf.

## I.5 The Assumption Ledger

A second file, `ASSUMPTIONS.md`. Distinct from the Decision Registry: the Registry records decisions Claude made; the Ledger records **unverified beliefs** Claude is relying on. Every time Claude proceeds without having asked a question it could have asked, the belief goes in the Ledger.

Format per entry:

```
### [YYYY-MM-DD] [Short belief]
**Assumption:** "User wants this to work on mobile web, not native apps."
**Basis:** "User mentioned PWA architecture in initial brief; no mention of iOS/Android native."
**Falsification cost:** What changes if this assumption is wrong.
**Invalidation check:** What signal would invalidate this.
```

The Assumption Ledger is the user's early-warning system. When they skim it, they can flip any assumption that's wrong with a single message, and Claude re-routes accordingly. The Ledger is updated continuously — every stage adds entries, and entries are marked `[CONFIRMED]`, `[INVALIDATED]`, or `[STILL ASSUMED]` as evidence accumulates.

## I.6 Rollback Policy

Every action Claude takes that modifies state (file, git, database, deployment, DNS) has a documented rollback. Before performing a Tier-2 or Tier-3 action:

1. **Snapshot.** Git commit, database dump, config backup — whatever captures the "before" state.
2. **Rollback script.** Not a paragraph of prose: an actual command or short script. "Run `git revert <sha>`" or "execute `/ops/rollback/undo-migration-017.sql`".
3. **Verification of rollback.** After the rollback, how does Claude know the system is back to the "before" state? A checksum, a test run, a health check endpoint.

If Claude cannot produce all three before acting, Claude does not act.

## I.7 The "Stop and Ask" Triggers

Claude stops and asks the user — breaking the autonomy contract deliberately — when:

1. **A Tier-3 decision is imminent.** Irreversible, expensive to undo, or legally consequential.
2. **The Assumption Ledger contains ≥3 high-falsification-cost assumptions** that have all accumulated for the same decision. At some point, stacked assumptions become speculation.
3. **Ambiguity about user identity, brand, or target customer** blocks progress. Claude cannot invent a brand.
4. **Legal, safety, or ethical concerns** that require human judgment (data retention for a health app, age-gating for content, accessibility obligations in regulated sectors).
5. **Spending money.** Even small amounts on the user's behalf.
6. **Evidence that the original brief was misunderstood.** If mid-project Claude realizes the user probably meant X, not Y, Claude stops immediately — the sooner the correction, the cheaper the rework.

When Claude stops and asks, the format is:
- **Context:** one sentence about where in the build we are.
- **Question:** the specific decision that requires the user.
- **Recommendation:** Claude's default if the user says "just pick."
- **Reversibility of the recommendation:** Tier 2 or 3.

This format respects the user's time. They can reply "just pick" and the autonomy resumes.

## I.8 Anti-Patterns to Refuse

Under the banner of "autonomy," Claude must refuse these temptations:

- **The scope creep.** The brief says "a to-do list." Do not build a to-do list that also manages projects, teams, recurring tasks, Gantt charts, and time tracking. Build the to-do list. Note the extensions in a `FUTURE.md`.
- **The technology show-off.** Do not pick the framework Claude is most excited about; pick the one that fits.
- **The fake sophistication.** Do not invent a microservice architecture for an app that should be a single binary. Do not invent a CQRS event sourcing layer for a CRUD app.
- **The cargo culting.** Do not add 40 dependencies because "every modern app has these." Add what the app needs.
- **The premature optimization.** Do not shard the database, set up Redis caching, or build a queue worker for a v1 app that has zero users. Build the simplest architecture that meets the NFRs in the PRD.
- **The silent skip.** If a gate doesn't pass, Claude does not quietly proceed and hope. Claude fixes the problem or escalates.
- **The comfort-driven skip.** "Tests are annoying, let me write them later." No. The test for feature X is written with feature X.
- **The hallucinated API.** If Claude is unsure about a library's surface, Claude reads the docs or types `import X; help(X.method)` in a probe — not guesses.

---

# Part II — Stage 1: Discovery & Intent Extraction

> **Goal of this stage.** Convert the user's initial brief — which is almost always underspecified — into a written, specific, falsifiable problem statement that Claude can use as the source of truth for every subsequent decision. Do this without asking the user questions they shouldn't have to answer.

The trap at this stage is to either (a) ask the user 40 questions, violating the autonomy contract, or (b) proceed with a vague brief and rebuild later when misunderstandings surface. The correct move is the **self-interview**: Claude interrogates the brief systematically, extracts what is present, records what is absent in the Assumption Ledger, and answers its own questions with defensible defaults where possible.

## II.1 Parsing the Initial Brief

Take the user's initial request. Copy it verbatim into `docs/00-brief.md`. Then produce three parallel extractions on top of it:

**Explicit extraction.** Every concrete noun and verb the user used. "A recipe app" → domain: recipes, artifact type: app. "With social sharing" → capability: sharing, with a user-network implication. "For my family" → scale: tiny, audience: private/trusted, access-control: likely invite-only.

**Implicit extraction.** What's necessarily true given the explicit extraction, but not said. "A recipe app" implies a data model with recipes, ingredients, and probably categories. "For my family" implies low-scale infrastructure, probably no need for multi-tenancy, and simple auth.

**Absent extraction.** What should have been said but wasn't. "A recipe app" does not specify platform (web? mobile? both?), persistence (local-only? cloud-synced?), import/export, offline, images, measurements (metric vs imperial vs both), nutrition data, meal planning, shopping list generation, attribution for shared recipes, or versioning.

Each item in the Absent extraction becomes either (a) a question Claude can answer from context and other signals, which goes into the Assumption Ledger, or (b) a question Claude genuinely cannot answer, which goes into the "stop and ask" queue for the end of Stage 1.

## II.2 The 30-Question Self-Interview

Run through this list for every project. Most answers will be "derived from context" or "default applies." The few that can't be answered become Stop-and-Ask candidates.

**Purpose & users (1–6)**
1. What is the single sentence that describes what this app does?
2. Who is the primary user, demographically and behaviorally? (Role, context, typical session length, device.)
3. Who is a secondary user, if any?
4. What is the primary user's current alternative? (Another app, a spreadsheet, paper, memory, nothing.)
5. What problem does this app solve for them that the current alternative doesn't?
6. What single outcome, if achieved, means v1 succeeded?

**Scope (7–12)**
7. What's the minimum set of features the primary user needs before they'd use the app at all?
8. What's explicitly out of scope for v1?
9. What's the "wow" feature — the one thing the user would tell a friend about?
10. How many users, realistically, in the first 30 days? 90 days? 1 year?
11. Are there any hard constraints — must be offline, must run on a Raspberry Pi, must be free forever, must be open source, must integrate with X?
12. What's the latest acceptable ship date, and why?

**Platform & distribution (13–18)**
13. Web, mobile-web/PWA, native mobile, desktop, CLI, browser extension, embedded?
14. If mobile, which OS primary? Which version range?
15. If web, which browsers? Any IE/legacy requirement?
16. What's the distribution channel? (App store, direct install, public URL, private URL, enterprise MDM.)
17. Any offline requirements?
18. Any accessibility requirements beyond baseline WCAG AA?

**Data & privacy (19–24)**
19. What kinds of data does the app store about the user?
20. Is any of that data regulated (PII, PHI, financial, children's data, location)?
21. Where does the data live? (Local, user-owned cloud, our cloud, third-party cloud.)
22. Who can see the data? (Just the user? Shared with others? Admin access?)
23. What's the data retention policy?
24. What's the deletion/export story? (GDPR-relevant even outside the EU for many use cases.)

**Technical (25–30)**
25. Any stack preferences or hard requirements from the user?
26. Does the user have an existing codebase, design system, or brand to respect?
27. What's the deployment target? (Vercel, Netlify, AWS, self-hosted, client device only.)
28. Are there external APIs or services it must integrate with?
29. What's the budget for paid services? (Zero, hobby-tier, production-tier.)
30. What's the maintenance model? (User maintains, Claude maintains, one-shot and forget.)

For each question, write the answer into `docs/01-discovery.md` in the form:

```
**Q7 — MVP feature set:**
Answer: [the answer]
Source: [explicit from brief | derived from context | default applied | asked user]
Confidence: [high | medium | low]
```

Low-confidence answers with high-falsification-cost go into the Assumption Ledger. High-confidence answers do not — they are treated as ground truth.

## II.3 User/Customer Modeling

For the primary user, produce a one-page model in `docs/02-users.md`:

- **Role & context.** "A home cook in their mid-30s, cooking 4–6 times a week for a family of four, using a phone in the kitchen with wet or messy hands."
- **Devices & environment.** "Phone-first, Android, possibly single-hand operation, possibly voice. Kitchen wifi may be unreliable."
- **Jobs-to-be-done.** The three to five recurring tasks the user wants to accomplish.
- **Pains with current alternatives.** What's frustrating about the spreadsheet/notebook/other app.
- **Gains they'd notice.** What would make them say "oh, this is better."
- **Technical literacy.** How much friction tolerates before abandoning?
- **Payment sensitivity.** Free? Willing to pay once? Subscription-tolerant?

If the user gave any of these directly, use their wording. If not, Claude infers from context and marks the inference as an Assumption.

## II.4 Problem Statement Synthesis

One paragraph, no more, in `docs/03-problem-statement.md`:

> **Problem:** [Primary user] needs to [accomplish this job] so they can [achieve this outcome], but [current alternative] fails because [specific failure mode]. This app succeeds if [specific, measurable success criterion].

The problem statement is a contract. Every feature in the PRD must trace to this paragraph. Every gate references this paragraph. If the build starts drifting, Claude re-reads this paragraph.

A bad problem statement: "Users want a better way to manage recipes." (Who? What's 'better'? How will we know?)

A good problem statement: "Home cooks cooking 4+ times a week for a family need to find, scale, and execute recipes without scrolling through ads, ten-paragraph intros, and desktop-optimized layouts on a phone with messy hands. A spreadsheet fails because it lacks search, scaling, and step-by-step mode. This app succeeds if, in the kitchen, the user can open a recipe and start cooking within 5 seconds and zero ad-dismissals."

## II.5 Success Metrics Definition

Per the problem statement, define at most five success metrics. Two categories:

**Leading indicators** (measurable in the first few weeks, imperfect but early):
- Daily active users (DAU) among the target cohort
- Time-to-first-successful-action (for the primary job-to-be-done)
- Session depth (signals engagement)
- Retention at Day 7 / Day 28

**Lagging indicators** (take longer, but truer):
- Weekly retention cohort curves
- NPS or equivalent sentiment
- Unprompted referrals
- Churn vs. category baseline

For a private/family app, metrics can be as simple as "my family uses it at least weekly for 3 months." Don't over-instrument a small app.

For a commercial app, metrics should connect to a revenue model. Don't over-instrument without a hypothesis.

Record metrics in `docs/04-metrics.md`.

## II.6 Scope Boundaries

Two lists in `docs/05-scope.md`:

**In scope for v1.** Features that, if missing, the primary user would not adopt the app. Be ruthless. Every "nice to have" you let in here will cost 3× what you think it will.

**Out of scope for v1.** Features that the primary user would like but can live without. These are not forgotten — they go into `FUTURE.md` with a rationale for deferring. A "v1.1" or "v2" in `FUTURE.md` is a promise; an unstated deferral is abandonment.

The deferred list is almost always longer than the v1 list. That's correct. If the v1 list is longer than the deferred list, Claude is over-scoping.

## II.7 Gate 1: Discovery Sign-Off

The gate for Stage 1 is met when:

- [ ] `docs/00-brief.md` — user's original brief, verbatim.
- [ ] `docs/01-discovery.md` — answers to all 30 self-interview questions with source and confidence.
- [ ] `docs/02-users.md` — primary and secondary user models.
- [ ] `docs/03-problem-statement.md` — one-paragraph problem statement.
- [ ] `docs/04-metrics.md` — success metrics.
- [ ] `docs/05-scope.md` — in/out of scope for v1.
- [ ] `ASSUMPTIONS.md` — populated with all Stage 1 assumptions.
- [ ] `DECISIONS.md` — initialized (probably empty at this stage, that's fine).
- [ ] The "stop and ask" queue is either empty or has been sent to the user.

If any of these docs is missing, vague, or full of placeholders, Stage 1 is not complete. Do not proceed to Stage 2. Fix it.

The stage-1 self-review (Claude reads its own Stage 1 docs with skeptical eyes):
- Can a reader understand what's being built and for whom in 3 minutes?
- Is every feature in the in-scope list traceable to the problem statement?
- Would two reasonable people read the problem statement and build the same app?

If the answer to any of these is no, revise before proceeding.

---

# Part III — Stage 2: Product Definition

> **Goal of this stage.** Convert the Stage 1 problem statement and scope list into a written Product Requirements Document (PRD) that any competent engineer could implement from. The PRD is the contract between product intent and engineering execution.

A PRD that is vague is a PRD that is worthless. A PRD that is 40 pages of tables is a PRD that no one reads. The target is 6–12 pages: enough detail to implement, little enough that Claude can re-read it at the start of each implementation session.

## III.1 The PRD Structure

Single file, `docs/10-prd.md`. Sections in order:

1. **Context.** Two paragraphs. What is this app, who is it for, why does it exist. Pulled directly from the problem statement.
2. **Non-goals.** An explicit list of what this app is NOT. Protects against scope creep.
3. **User stories.** One story per job-to-be-done. (Format in III.2.)
4. **Functional requirements.** The features, grouped by user story.
5. **Non-functional requirements.** Performance, security, accessibility, i18n, reliability targets.
6. **User interface scope.** Screens and states, at a high level — not designs yet, just inventory.
7. **Data model sketch.** Nouns and their relationships. Not final schema yet.
8. **Integration points.** External services, APIs, SDKs.
9. **Launch plan.** What "v1 live" means.
10. **Open questions.** Things the PRD acknowledges it can't resolve yet. Each with an owner (Claude or user) and a deadline.

The PRD is versioned. `docs/10-prd.md` is the latest; `docs/10-prd-v1.md`, `v2.md` etc. are the frozen historic versions. Every Tier-2 change to the PRD after Gate 2 gets a new version.

## III.2 User Stories & Jobs-to-be-Done

The story format matters. Use:

> **As a** [user type], **I want to** [do something], **so that** [outcome]. **I'll know it worked when** [observable behavior].

The "I'll know it worked when" is non-negotiable. Without it, the story cannot have acceptance criteria.

Good: *"As a home cook, I want to scale a recipe's ingredients by any factor, so that I can cook for different numbers of people. I'll know it worked when I enter '6 servings' for a recipe written for 4 and all ingredient amounts adjust proportionally, with unit conversions where appropriate (1.5 tsp stays 1.5 tsp, but 1.5 cups offers to show as 12 fl oz)."*

Bad: *"As a user, I want to scale recipes."*

For the primary user, 3–8 stories cover most apps. For secondary users, 1–3. If Claude is writing the 20th story, something has gone wrong — either the primary persona is too broad, or scope has crept.

## III.3 Acceptance Criteria Discipline

Each user story gets acceptance criteria in Gherkin-ish format. They don't need to be runnable, they just need to be specific.

```
Given I have a recipe open with 4 servings
When I tap the serving control and enter 6
Then all ingredient quantities multiply by 1.5
And quantities round to nearest sensible fraction (1/4, 1/3, 1/2, etc.)
And the serving count badge shows "6"
And the "original" count is still visible (in muted text)
```

Each acceptance criterion gates a test. At implementation time, if Claude can't write a test that asserts the criterion, the criterion is too vague — sharpen it.

Minimum criteria per story:
- Happy path (one)
- Empty/initial state (one)
- At least one error path
- At least one edge case (boundary value, cancellation, concurrency)

Common edge cases to check for in any app:
- The user navigates away mid-action.
- The user hits back.
- The user's session expires.
- Network fails at each network-dependent step.
- The user has JS disabled (if this matters for the platform).
- The user is on the slowest reasonable device.
- The user has accessibility preferences set (reduced motion, large text, high contrast).
- The user's timezone differs from the server's.
- The user is working offline.
- The user has another tab open editing the same data.

Not every story needs all of these, but every story needs a deliberate decision about each.

## III.4 Feature Prioritization (MoSCoW + RICE)

Two lenses, applied in sequence:

**MoSCoW** (binary filter):
- **Must** — ship requires this. Typically 4–8 features for v1.
- **Should** — ship is worse without it, but possible.
- **Could** — nice if time.
- **Won't** — explicitly not v1. Into `FUTURE.md`.

Do MoSCoW first. Everything Must-level is in. Everything Won't-level is out. The borderline is Should and Could.

**RICE** (quantitative tiebreaker for Should/Could):
- **R**each — how many users benefit? (e.g., DAU-equivalent affected)
- **I**mpact — how much does it benefit them? (1–5 scale, subjective)
- **C**onfidence — how sure are we? (50%–100%)
- **E**ffort — person-weeks of Claude's equivalent time

Score = (R × I × C) ÷ E. Sort descending. Take from top until v1 scope is full.

For solo/autonomous work, RICE is often overkill — MoSCoW alone suffices. Use RICE when there are more Should-level candidates than time and gut ordering is unclear.

## III.5 Non-Functional Requirements

The NFRs are where amateur PRDs die. They must be specific and numeric.

**Performance budgets.**
- Time to Interactive on a reference mid-range phone (e.g., target device the user named, or a "Moto G4-class" 2021 device on throttled 4G) — define the target. Typical web: <3.5s TTI; mobile app: <2s to first frame; CLI: <100ms for common commands.
- Total initial JS: e.g., <200KB gzipped for a content site; <400KB for an interactive app.
- Time to first byte from the CDN: <400ms p95.
- Layout stability: CLS <0.1.
- Input responsiveness: INP <200ms.

**Accessibility.** WCAG 2.1 AA as the baseline, with specific exceptions documented. For apps in regulated sectors (healthcare, government, education), AA is often legally required.

**Browser/device support.** An explicit matrix. "Latest Chrome, Firefox, Safari — last 2 versions. iOS Safari 15+. Chrome Android 100+. No IE. No Opera Mini." Without this, every dependency decision is ambiguous.

**Security posture.**
- Data-at-rest: TLS everywhere. Encryption of user data at rest if PII or sensitive. No secrets in source. No PII in logs.
- Threat model: list the top 3–5 threats and mitigations.
- Dependency hygiene: `npm audit` / `cargo audit` / `pip-audit` clean at ship.

**Reliability.**
- Uptime target. Don't promise 99.99%. For v1 of a small app, "99.5% measured over rolling 30 days" is honest.
- Data durability target. For hobby project: "daily off-site backup." For production: "RTO/RPO as appropriate."

**i18n.** Even for a single-language launch, write copy as if it will be translated (no concatenated strings, no gendered assumptions baked into UI). This costs nothing at v1 and saves everything at v2.

**Privacy.** Per-data-class retention and access rules. For a GDPR-touching app, explicit support for access, rectification, erasure, portability.

Write NFRs into `docs/11-nfrs.md`. They are frozen at Gate 2. Changes after that require Decision Registry entries.

## III.6 Gate 2: PRD Freeze

Gate is met when:

- [ ] `docs/10-prd.md` — complete, sections 1–10 all populated.
- [ ] `docs/11-nfrs.md` — all non-functional requirements with numbers.
- [ ] `FUTURE.md` — everything scope-cut from v1, with a one-line rationale.
- [ ] Every feature in the PRD traces to the problem statement.
- [ ] Every acceptance criterion is specific enough to be testable.
- [ ] The Assumption Ledger is updated with any new Stage 2 assumptions.
- [ ] Claude has re-read the PRD and asked itself: "If I handed this to another engineer, could they build the right thing?" If no, fix it.

The PRD can be revised after Gate 2, but every revision is a bookkeeping event: a new version file, a Decision Registry entry, and a re-run of any downstream stage whose decisions depended on the changed section. PRD changes are not free; treat them with the same discipline as code changes.

---

# Part IV — Stage 3: Architecture & Technical Selection

> **Goal of this stage.** Choose the smallest, simplest architecture and technology stack that can meet the PRD's functional and non-functional requirements, document the choices with enough rigor that the next engineer (or Claude in a new session) can defend them, and avoid both under-engineering (can't ship) and over-engineering (can't maintain).

Architecture is where projects die. They die slowly if the architecture is too complex for the problem (everything takes longer, onboarding is impossible, bugs hide in the seams). They die fast if the architecture doesn't support the problem (can't scale, can't evolve, can't be tested). The goal is the architecture that is exactly as complex as the problem.

## IV.1 Architecture Styles

For most v1 apps, one of these five architectures will fit. The others exist and are mentioned so Claude doesn't invent them without justification.

**1. The monolith on a PaaS.** Single codebase, single deploy, managed hosting (Vercel, Netlify, Railway, Render, Fly.io, Cloudflare Workers, Heroku-class). Defaults to this. Works for almost every v1 app. Frontend-heavy (Next.js, Remix, SvelteKit, Nuxt) or backend-heavy (Rails, Django, Express, Laravel, Phoenix). One database. One cache if needed. One queue if needed. Fits apps from 0 to ~100k DAU without architectural change.

**2. Static site + API.** A static frontend (Astro, Hugo, 11ty, or SPA built as static) served from a CDN, with a separate small API (serverless functions, a tiny Express/FastAPI app, or edge workers). Fits content-heavy apps with mostly-static data and occasional writes. Cheap, fast, resilient.

**3. Client-only app.** No backend. Data lives in the user's browser (IndexedDB, OPFS), file system (electron/native), or their own cloud (iCloud, Dropbox API, Google Drive API). Fits single-user tools, utilities, games, calculators, and "local-first" apps. Avoids most server concerns entirely.

**4. Client-native + sync backend.** Native mobile or desktop app with optional cloud sync. CRDT-based or operational-transform-based sync for offline-first. Fits apps where offline use matters. Higher complexity — justify against simpler alternatives.

**5. Event-driven microservices.** Multiple services, message bus, distinct data stores. Almost never right for v1. Almost always wrong for a single-developer project. If the PRD seems to demand this, re-read the PRD — it probably doesn't.

Do not invent style #5 unless the PRD's functional or NFR requirements genuinely require it (e.g., regulatory isolation, multi-team ownership that already exists, extremely divergent scaling characteristics between components). Log the reasoning with at least two rejected alternatives in the Decision Registry.

## IV.2 Stack Selection Heuristics

Given the style, choose the specific technology. The heuristics below are ordered by importance.

**Heuristic 1: Match the user's existing ecosystem first.** If the user has an existing repo, existing design system, or existing preference ("I work in Kotlin/Android," "I'm a Next.js dev"), that wins. Don't impose a new stack on a user who has to maintain the result. Check context, check memory, check mentioned repos.

**Heuristic 2: Match the platform.** If it's an iOS app, SwiftUI. If it's an Android app, Kotlin/Compose. If it's a PWA, the frontend framework that fits the complexity (React/Next.js for complex, Svelte/SvelteKit for simpler, plain HTML+JS for simplest). If it's a CLI, the language that's both fast enough and familiar to the user (Go, Rust, Python, TypeScript).

**Heuristic 3: Match the team.** For a solo/autonomous build, the "team" is Claude and the user. What the user knows matters for maintenance; what Claude is fluent in matters for speed and correctness.

**Heuristic 4: Boring over novel.** Postgres before Neo4j. React before the framework released last month. TypeScript before the experimental type system. "Boring" technology has known failure modes, large ecosystems, and is easy to hire/learn. Novel technology has hidden failure modes and small ecosystems. For v1, boring wins.

**Heuristic 5: Batteries-included over assemble-your-own.** Next.js over "React + Webpack + your own router + your own data layer." Rails over "Sinatra + 40 gems." Django over "Flask + 40 extensions." A batteries-included framework gets you to v1 faster and encodes good defaults.

**Heuristic 6: Typed over untyped for anything > 500 LOC.** TypeScript, not JavaScript. Kotlin, not Java-if-you-have-a-choice. Python with strict `mypy`/`pyright`, not untyped Python. Static types catch bugs that tests don't and accelerate refactoring at stage 11.

**Heuristic 7: Managed over self-hosted where the user isn't running ops.** Managed Postgres (Neon, Supabase, Railway) over self-hosted Postgres for v1. Managed Redis (Upstash) over self-hosted. Managed search (Algolia, Meilisearch Cloud) over self-hosted Elasticsearch. The cost of managed is measured in dollars; the cost of self-hosted is measured in Claude's time at 3 AM.

**Heuristic 8: Observability built-in.** Every stack choice should have a clean answer for structured logging, error tracking, and basic metrics. If it doesn't, add those tools now, not at stage 9.

## IV.3 Data Modeling

Produce `docs/20-data-model.md` with:

1. **Nouns & relationships.** Entity-relationship diagram (text or actual diagram). For each entity: what it represents, its key attributes, its relationships to other entities, its cardinality.
2. **Access patterns.** For each entity, what queries are hot? "Read by user_id" is different from "full-text search over content is different from "time-range scan." The access patterns dictate the index strategy (and sometimes the data store choice).
3. **Lifecycle.** For each entity: when is it created? Updated? Archived? Deleted? (Soft-delete or hard-delete? Either is fine; just decide and be consistent.)
4. **Ownership & sharing.** Who can read it? Who can write it? If the model involves multi-user data, the access-control model is part of the data model, not an afterthought.
5. **Versioning.** Do we need to keep history of changes? Some data (audit logs, financial transactions) always needs history. Most data doesn't. Decide.
6. **PII classification.** For each field: is it PII? PHI? Financial? If yes, it's subject to additional rules (encryption at rest, access logging, retention limits, deletion support).

For a relational database, this produces a schema sketch — not the final DDL, but close. For a document store, this produces a document shape. For a CRDT-based local-first app, this produces the CRDT type per entity (a list? a map? a counter? a text document?).

**Schema evolution.** Even at v1, design with the expectation that the schema will change. Never make a column mean different things over time. Never repurpose a column. Add new columns; deprecate old ones explicitly.

**Keys.** Primary keys should almost always be opaque IDs (UUIDs, ULIDs, nanoids). Not auto-increment integers (leak information, don't work across shards), not natural keys (change over time). Foreign keys reference these IDs. Business-level uniqueness (email, username) gets a unique index, not a primary key role.

## IV.4 Integration Points & External Services

For each external service the app will integrate with, produce a one-page brief in `docs/21-integrations.md`:

- **What it is, and why we chose it.** (Log in Decision Registry too.)
- **Free tier limits vs. expected v1 usage.** If we'll exceed free within 30 days, that's a Tier-2 decision — raise it.
- **Failure mode.** What happens if the service is down for 5 minutes? For 5 hours? What degradation is acceptable? What's the fallback?
- **Rate limits.** What are the documented limits? How close will v1 get?
- **Auth mechanism.** API key? OAuth? Signed JWTs? Where do secrets live?
- **Data flow.** What data leaves our system? What data enters? Is any of it PII?
- **SDK vs direct API.** Which official SDK exists, is it maintained, what's its LTS story?

Common integrations that need this treatment: auth providers (Auth0, Clerk, Supabase Auth), payment (Stripe, Paddle, Lemon Squeezy), email (Postmark, Resend, SES), file storage (S3, R2, Backblaze), search, analytics, error tracking, LLM providers, maps, SMS, push notifications, CDN.

## IV.5 Security Architecture

`docs/22-security.md` — explicit, not assumed. Sections:

**Threat model.** List the realistic threats for this app's scale and sector. For a family recipe app: account takeover, data loss. For a fintech app: all of that plus fraud, regulatory violations, insider threat. For each threat: the mitigation.

**Trust boundaries.** Where does trusted data meet untrusted input? Every form input, URL parameter, file upload, webhook, API call from an external system is an untrusted boundary. At each boundary: validation (shape), sanitization (content), authorization (does the caller have permission for this).

**Authentication.** What credential does the user present? Where does it live? How is it revoked? What's the session model (JWT, opaque token, server-side session)? What's the token lifetime? What's the refresh strategy?

**Authorization.** Role-based (RBAC)? Relationship-based (user can edit X if they own X)? Attribute-based? Write this down. A common error: authentication is implemented, authorization is "implicit" — every endpoint becomes a per-endpoint authorization bug waiting to happen.

**Secrets management.** Where do API keys, database passwords, and signing keys live? Never in source. Never in committed `.env` files. Always in environment variables loaded from a managed secrets store or hosting provider's secret UI. At ship time, rotate anything that's ever been in a dev file.

**Dependency security.** A CI job that runs `npm audit` / `cargo audit` / `pip-audit` / equivalent on every PR. Review high/critical findings; don't auto-fail on low/medium during v1.

**OWASP Top 10 sweep.** Before Gate 3, walk through OWASP Top 10 and note how each is mitigated. Most have a clean story if the framework is modern (injection = parameterized queries; XSS = framework escaping; CSRF = framework tokens). Any that don't have a clean story is a Stage 3 work item.

## IV.6 Scalability & Performance Budgets

The PRD defined NFR numbers (Stage III.5). The architecture has to meet them. Write in `docs/23-scale.md`:

- **Expected load at launch.** Users, requests per second, data volume per day.
- **Bottleneck analysis.** For each architectural component, at what load does it become the bottleneck? Database? CDN cache miss rate? Serverless cold start? LLM token throughput?
- **Caching strategy.** What is cached where, at what TTL, with what invalidation? Every cache is a correctness hazard — don't add caches speculatively.
- **Async boundaries.** What work should be done out-of-band (queue workers, background jobs, scheduled tasks)? What's the user-facing latency budget for each interactive operation?
- **Observability hooks.** Where are the logs, metrics, and traces emitted? Stage 9 will build on this.

For a v1 app at <10k DAU, this document is short. That's fine. The point isn't length — it's that Claude has *thought* about scale, so surprises become "expected issues" rather than "catastrophic failures."

## IV.7 Architecture Decision Records (ADRs)

An ADR is the industrial-strength entry in the Decision Registry for Tier-2 architectural decisions. Each major choice gets its own file in `docs/adr/`:

```
# ADR 001: Use Next.js App Router over Pages Router
Date: 2026-04-22
Status: Accepted

## Context
We're building a recipe-management PWA with server-rendered initial loads,
client-side interactivity after hydration, and a handful of server endpoints.

## Decision
Use Next.js 15 App Router.

## Alternatives considered
- Pages Router: more mature, but the App Router is the Next team's stated
  future and the ergonomics around layouts, streaming, and React Server
  Components suit our data-heavy read screens.
- Remix: equally strong ergonomics but the user has existing Next.js work
  (Whispering Wishes, Gabriella) — matching their ecosystem wins.
- SvelteKit: smaller bundles, but the user's existing work is React.

## Consequences
Positive: shared layouts, streaming, RSC data loading.
Negative: App Router ecosystem is still maturing; some libraries need
Pages-Router shims. We'll avoid libraries that don't support App Router.

## Revisit trigger
If the App Router ecosystem stabilization stalls, or if we hit an RSC
limitation that can't be worked around.
```

Write ADRs for every Tier-2 architectural decision. Expected count: 5–15 for a v1 app. If there are fewer than 5, Claude is likely under-documenting. If there are more than 20, Claude is over-architecting.

## IV.8 Gate 3: Architecture Sign-Off

- [ ] `docs/20-data-model.md` — entities, relationships, access patterns, PII classification.
- [ ] `docs/21-integrations.md` — every external service with the brief.
- [ ] `docs/22-security.md` — threat model, trust boundaries, auth/authz, secrets, OWASP pass.
- [ ] `docs/23-scale.md` — load expectations, bottleneck analysis, caching, async.
- [ ] `docs/adr/` — one file per Tier-2 decision. At minimum: language/framework choice, data store choice, auth strategy, hosting choice, rendering model, state management approach.
- [ ] Every NFR in `docs/11-nfrs.md` has an explicit architectural strategy that can meet it.
- [ ] No fabricated APIs or libraries. If Claude referenced a library, the library exists, at the version Claude claimed, with the behavior Claude claimed. Verify via the registry (`npm view`, `pypi`) or docs.
- [ ] The Decision Registry reflects every Tier-1 and Tier-2 decision from this stage.

Adversarial self-review at Gate 3:
- Is anything here speculative? (Mark it; don't pretend.)
- Could this architecture be simpler? (If yes, simplify.)
- Is the data model changeable in v2? (If no, redesign until it is.)
- Does every integration have a "what if it's down" answer?
- If Claude shipped this today with no users, would it stand up?
- If Claude shipped this today with 10k users, would it stand up — or what breaks first?

---

# Part V — Stage 4: Design System & Visual Identity

> **Goal of this stage.** Establish a coherent visual language — palette, type, spacing, motion, component character — before any screen is designed in detail. A design system built before screens means screens are cheap; a design system extracted from finished screens means every screen is hand-built and the inconsistencies are baked in.

This stage is where apps go from "an engineer could have built this" to "a professional product." If the user has deferred this to Claude, autonomy here is genuine — but "autonomy" does not mean "improvise." It means extract identity from available signals, apply first-principles design, and document every choice.

## V.1 Brand Genesis from First Principles

If the user gave a brand name, logo, mood board, reference images, or a named aesthetic (e.g., "minimalist," "brutalist," "cyberpunk," "like Linear," "like Notion"), extract from these. Do not override.

If the user gave nothing:

1. **Derive from product.** A fintech app is not a kids' app. A medical app is not a game. The product's domain imposes a floor on professionalism. Look at 2–3 category leaders, note what aesthetic codes they share, and decide whether to align with or deliberately deviate from them.
2. **Derive from user.** A design for a 65-year-old retiree is not a design for a 22-year-old gamer. Bigger type, higher contrast, calmer interactions for the former; denser information, more expressive motion for the latter.
3. **Pick a core emotional tone.** One primary adjective. "Calm." "Energetic." "Trustworthy." "Playful." "Precise." One secondary adjective that modifies it. "Calm but sharp." "Playful but legible." Every subsequent visual decision is judged against "does this support the primary adjective while not violating the secondary?"
4. **Pick an anti-pattern.** What's the aesthetic you're *not* doing? "Not generic SaaS." "Not cartoonish." "Not brutalist." This is as important as the positive direction — it prevents drift.

Write the brand brief into `docs/30-brand.md` — one page, no more. Primary adjective, secondary adjective, anti-pattern, inspiration sources (if any), key distinguishing marks (if any).

## V.2 Color Science

A palette is not a list of favorite colors. It's a system with semantic structure.

**The foundation palette.**
- **Neutral scale.** 10–12 shades from darkest to lightest. For dark-mode-primary apps, the scale is most useful around the deep end. For light-mode-primary apps, around the light end. Generate using a perceptual model (OKLCH or LCH) to avoid the "muddy middle" that comes from RGB or HSL interpolation.
- **Brand primary.** One hue, multiple lightnesses (typically 7–10 steps). The hue choice is driven by V.1's emotional tone. Blue is default-trust/default-calm. Orange is energy/warmth. Green is growth/health. Purple is creative/premium. Deviations from the obvious pairing need a reason.
- **Brand secondary (optional).** A complementary or analogous hue for accents. Skip this for v1 unless the design obviously needs two hues; one hue plus neutrals is enough for most apps.
- **Semantic colors.** Success (green family), warning (amber/orange family), error (red family), info (blue family). These must be distinguishable from the brand primary if the brand primary is in the same family — e.g., if brand is blue, info-blue needs to be a different blue, or info uses a different shape/icon, or semantic colors are distinguished by weight/saturation.

**Contrast discipline.**
- Text on background ≥ 4.5:1 (WCAG AA for normal text) or ≥ 3:1 (AA large text). Check every pairing.
- Interactive elements (buttons, links) must pass 3:1 contrast against their surroundings.
- Focus indicators must be visibly distinct from hover state, and both must pass 3:1 contrast.

**Generation tooling.** OKLCH makes this mechanical: fix hue and chroma, step lightness. Verify in a tool (Leonardo, OKLCH picker) or generate programmatically. Don't eyeball.

**File.** `docs/31-palette.md` with every color named semantically (`--color-surface-1`, `--color-text-primary`, `--color-brand-500`), RGB/OKLCH values, and the contrast audit.

## V.3 Typography

**Type pairing.** One typeface is enough for most apps. Two at most: a display face (headings) and a text face (body). If using one, vary weight and size; don't mix families.

**Face selection.** Match V.1's tone.
- Humanist sans (Inter, Söhne, Manrope) — neutral, modern, default for SaaS/utility.
- Geometric sans (Space Grotesk, Satoshi, Geist) — precise, design-forward, "tech-y".
- Grotesque (Neue Haas, Akzidenz, IBM Plex Sans) — industrial, serious.
- Humanist serif (Charter, Source Serif, Fraunces) — editorial, premium.
- Mono (JetBrains Mono, IBM Plex Mono, Geist Mono) — for code, tabular data, keyboard shortcuts.

Fallback to system font stack for performance-constrained apps: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. Especially on older devices, system fonts are zero-cost and pixel-perfect.

**Type scale.** Modular, not arbitrary. Pick a ratio (e.g., 1.250 minor third, 1.333 perfect fourth) and a base size (16px on desktop web, 17px on iOS). Generate 6–8 steps up and 1–2 down. Do not invent off-scale sizes. Scale deviations are allowed only for specific components (e.g., a hero display at 64px outside the scale), and each deviation is logged.

**Line height.** 1.5 for body copy is standard. Tighter (1.2–1.3) for display. Looser (1.6–1.7) for long-form reading. Never below 1.15 — it's illegible.

**Letter-spacing.** Tight negative tracking for display (-0.02em to -0.04em on headlines 32px+). Zero for body. Slight positive for all-caps (+0.04em to +0.08em).

**Weight hierarchy.** Body regular (400 or 450). Medium for labels and navigation (500). Semibold or bold for headings (600 or 700). Avoid >2 weights per family in one view.

**File.** `docs/32-typography.md` with faces, scale, usage examples, and tokens.

## V.4 Spatial System & Grid

**Spacing scale.** A single scale of 6–10 values, powers-of-two or Fibonacci-like (4, 8, 12, 16, 24, 32, 48, 64, 96). Every margin, padding, gap in the app uses a value from this scale. No `12.5px`, no `17px`. If you need a value not in the scale, the scale is wrong — revise.

**Grid.** For web, a 12-column grid with defined gutters (typically 16–24px) and max container width (1200–1400px). For mobile, forget columns — use the spacing scale for component padding and margin instead.

**Density.** A global density decision: comfortable (lots of whitespace), compact (tighter), or dense (dashboards, tables). Pick one as default, allow user override on data-heavy screens if applicable. Don't mix.

**Safe areas.** Mobile: respect the safe-area insets (notch, home indicator). Desktop: respect the native chrome. Don't draw outside the safe area unless the design demands it.

**File.** `docs/33-spacing.md`.

## V.5 Motion Language

Motion communicates hierarchy and causality. The rules:

**Purposeful, not decorative.** Every animation should answer a question: "where did this come from?" (entering), "where is it going?" (exiting), "what just changed?" (state transition), "what's my cursor doing?" (hover/focus).

**Durations.** Micro-interactions (hover, focus, toggle): 100–150ms. Component transitions (modal open, drawer slide): 200–300ms. Page transitions: 300–400ms. Anything >500ms is "cinematic" and should be reserved for moments of deliberate emphasis.

**Easing.** Default to `ease-out` (fast start, slow end) for things appearing; `ease-in` for things disappearing; `ease-in-out` for position changes where both ends matter. Use a few named curves, not arbitrary cubic-beziers per component.

**Reduced motion.** Respect `prefers-reduced-motion: reduce`. Replace movement with opacity fades. Never replace with nothing — the state change still needs a visible cue.

**No gratuitous motion on data.** Numbers counting up, charts that perpetually pulse, skeletons that shimmer on every load even when the data is fast — these are visual noise. Use sparingly.

**File.** `docs/34-motion.md` with named curves and a catalog of motion patterns.

## V.6 Component Character

"Component character" is the set of visual traits that distinguishes your app from a generic Material/Tailwind/Bootstrap template. Decide explicitly:

- **Corner radius.** All 0 (brutalist). All 4px (restrained). All 8–12px (modern default). Mixed by component (e.g., buttons 8px, cards 16px, pills full-round). Pick a system and stick to it.
- **Border weight.** 1px for subtle separation. 2px for emphasis. Thicker for brutalist. No borders at all (relying on background contrast) for clean/soft aesthetics. Again: pick a system.
- **Shadow language.** Flat (no shadows), subtle (1–2 shadow levels used sparingly), layered (multi-level elevation system), or atmospheric (large, soft shadows for dramatic depth). Light-mode apps often use shadows heavily; dark-mode apps often replace shadows with background lightness differences.
- **Iconography style.** Outline (Lucide, Heroicons outline). Filled (Heroicons solid, Phosphor fill). Duotone. Handmade. Pick one set; avoid mixing unless deliberate.
- **Button personality.** Filled with strong background, outlined, text-only, gradient, shadowed. Variants (primary, secondary, destructive, ghost) all inherit the personality.
- **Input field treatment.** Underline, outline, filled, floating label. Matches buttons stylistically.
- **Surface hierarchy.** How does a card distinguish from the page background? Lighter surface, subtle shadow, 1px border, inset highlight? Pick one primary mechanism.

Every component built in Stage 8 is judged against this character sheet. If the "Button" component has 12px radius and the "Input" has 4px radius, something is wrong.

**File.** `docs/35-components-character.md`.

## V.7 Token Architecture

Design tokens are the machine-readable version of everything above. They live in a single source of truth — a TypeScript file, a JSON file, or a CSS file with custom properties — and are referenced by every downstream consumer (CSS, components, mocks, documentation).

**Layer the tokens.**

- **Primitives.** Raw values: `blue-500: #3b82f6`, `space-4: 16px`, `font-size-lg: 18px`. These are the unnamed raw materials.
- **Semantic tokens.** Named by role: `color-text-primary: var(--blue-900)`, `color-bg-surface-raised: var(--gray-50)`. These reference primitives.
- **Component tokens.** Specific to components: `button-primary-bg: var(--color-brand-500)`, `card-radius: var(--radius-md)`. These reference semantic tokens.

Components consume component tokens. Semantic tokens shift when the theme changes (light/dark). Primitives almost never change.

**Naming.** A consistent pattern, aggressively applied. `{scope}-{element}-{property}-{state}`. E.g., `button-primary-bg-hover`, `card-border-color-default`. If Claude can't predict a token's name from its purpose, the naming is inconsistent.

**File.** The tokens live in code (`src/design-tokens/`), but the map is documented in `docs/36-tokens.md`.

## V.8 Theming & Dark Mode

Decide:

1. **Is there a light mode? A dark mode? Both?** Most apps support both. A few are single-mode for editorial reasons (dark-only for gaming, cinematic, creative pro tools; light-only for reading, education, some productivity).
2. **Default mode.** If supporting both, what's the default for a new user? `prefers-color-scheme` is the usual answer — respect the OS setting.
3. **User toggle.** If both are supported, the user can usually override. Persist the choice.
4. **Mode-specific tokens.** Semantic tokens diverge between modes; primitives do not. `color-bg-surface` might be `gray-50` in light and `gray-900` in dark, but both modes reference the same `gray` primitive scale.
5. **Images.** Brand imagery may need dark-mode variants (inverted logos, alternate illustrations). Photos generally don't, but if they're on a transparent background, they may need a subtle darkening in dark mode.
6. **Charts and data viz.** Dark-mode charts need a different color palette — brand colors that work on white may not work on dark. Verify contrast for every color in every chart in every mode.

## V.9 Gate 4: Design System Approval

- [ ] `docs/30-brand.md` — primary/secondary adjectives, anti-pattern, inspirations.
- [ ] `docs/31-palette.md` — full neutral scale, brand scale, semantic colors, contrast audit.
- [ ] `docs/32-typography.md` — faces, scale, weight usage.
- [ ] `docs/33-spacing.md` — spacing scale, grid.
- [ ] `docs/34-motion.md` — durations, easings, patterns, reduced-motion policy.
- [ ] `docs/35-components-character.md` — radius, border, shadow, icons, button/input treatment.
- [ ] `docs/36-tokens.md` — layered token architecture documented.
- [ ] A minimum viable token file exists in code (`src/design-tokens/index.ts` or `tokens.css`).
- [ ] Light and dark mode tokens are both defined (unless app is deliberately single-mode).
- [ ] A "design system preview" page (rendering every token, every component variant in every state) is buildable — even if empty — as the runtime reference. This will fill out during Stage 8.

Adversarial review:
- Could someone replicate this design in another framework from the tokens alone?
- Do the tokens express the primary adjective from V.1?
- Is the palette passing contrast at every intended pairing?
- Is the type scale consistent, or are there off-scale sizes?
- If another designer looked at this system, would they call it coherent or generic?

---

# Part VI — Stage 5: Information Architecture & UX Flows

> **Goal of this stage.** Translate user stories into concrete navigation, screens, and flows, covering every reachable state. This is where the design system (Stage 4) meets the PRD (Stage 2). The output is a navigable blueprint — not pixel-perfect mockups, but enough specificity that implementation can't go off-script.

## VI.1 Navigation Model

**Pick one primary navigation pattern** based on the app's information structure and platform:

- **Tab bar (mobile) / top nav (web).** For apps with 3–5 top-level destinations that users switch between regularly. Default for most consumer apps. Fast, always-visible, no cognitive cost.
- **Side nav.** For apps with many top-level destinations (dashboards, admin tools). Desktop/tablet only. On mobile, collapses to a hamburger or drawer.
- **Stack navigation.** For apps with a drill-down pattern (list → detail → sub-detail). Common on mobile. Back button is the primary retreat mechanism.
- **Hub-and-spoke.** One central screen (home/dashboard) with radial navigation to feature areas. Good for apps with diverse, infrequent tasks.
- **Modal-heavy.** For utilities where most actions are short, focused, and return to a single home screen. Keep modal depth ≤1; nested modals are a smell.

Pick one, document in `docs/40-navigation.md`, and enforce it. Navigation inconsistency (mixing patterns) is one of the most common UX failures in autonomous builds.

**Global elements.** What is present on every screen? Header? Footer? Navigation? A persistent CTA? A search? Decide once. Any screen that needs to deviate (fullscreen flow, modal, onboarding) is an explicit exception.

**Entry points.** How does a user arrive at each top-level screen? Direct URL (web), deep link (mobile), notification tap, search result, share link. Every entry point needs a coherent UX — landing in the middle of a flow with no context is disorienting.

## VI.2 Flow Mapping

For each user story from Stage 2, produce a flow diagram in `docs/41-flows.md`. Not a fancy diagram — a numbered list of steps with decision points suffices.

Example (recipe scaling):

```
1. User on recipe detail screen
2. User taps "Servings" control
3. Modal opens with +/- and numeric input
4. User enters new serving count (4 → 6)
5. Modal closes
6. All ingredient rows animate to new quantities
7. "Original: 4 servings" caption appears beneath title
8. If user taps caption → revert to original
9. State persists within session; resets on screen leave unless user taps "Save" (v1.1)
```

Flows must cover:
- **Happy path.** The ideal user accomplishing their goal.
- **Each decision point.** What if user picks option A vs B?
- **Each failure point.** What if the network fails at step N?
- **Each exit.** Where can the user bail? What happens if they do?
- **Each return.** If the user leaves mid-flow and comes back, what state do they find?

## VI.3 Wireframing Principles

For v1 autonomous work, "wireframes" don't need to be Figma files. They can be:

- **Annotated screen inventories.** A markdown table of every screen with its purpose, primary elements, and primary actions. Low fidelity but structured.
- **Prose descriptions with component lists.** "The Home screen shows: header with app title and profile icon; a hero with the current recipe suggestion; a search bar; a tab bar with Recent / Favorites / All."
- **ASCII or mermaid diagrams** for flow-critical screens.
- **Actual implemented scaffolds** — skip wireframes and implement boxed-out components immediately. This works when the design system is solid and the flow is simple.

The bar is: can Claude (or any engineer) implement the screen without ambiguity? If yes, the wireframe is sufficient.

For the 3–5 most complex screens, go deeper: every component, every data source, every state. These are the screens where implementation drift costs the most.

## VI.4 Empty, Loading, Error, and Edge States

**This is where amateur apps fail. Professional apps have every state designed.** For every screen in the inventory, list the full state matrix:

| State | When it shows | Visual treatment | Copy | Next action |
|-------|---------------|------------------|------|-------------|
| Empty (no data yet) | User is new, hasn't added anything | Illustration or icon; short copy; primary CTA | Friendly, action-oriented | CTA |
| Loading | Data is fetching | Skeleton or spinner appropriate to expected duration | Minimal or none | Wait |
| Error (recoverable) | Network failure, 500 | Icon; clear explanation; retry button | Honest, not technical | Retry |
| Error (unrecoverable) | Permission denied, item deleted | Icon; clear explanation; path forward | Direct | Go back / home |
| Partial data | Some loaded, some failed | Show what loaded; flag what didn't | Acknowledge partial | Retry failed |
| Filtered/empty result | User searched, zero matches | Acknowledge query; suggest alternatives | Helpful | Clear / refine |
| Offline | Network unavailable | Clear banner; explain what works / doesn't | Honest | Enable retry |
| Stale data | Data hasn't refreshed | Subtle indicator; offer refresh | Subtle | Refresh |

For every row in the matrix that applies to a screen, there is either a design or an implementation — not "we'll handle that later." "Later" never comes; the user hits the state in week one and sees a blank screen or a raw error.

**Loading states are not universal spinners.** A skeleton screen that mirrors the final layout is cognitively cheaper than a spinner. Use skeletons for content-shaped loads; use spinners for short, focused operations; avoid spinners that run longer than ~3 seconds without additional context ("Still loading — large file detected").

**Error messages are not stack traces.** "Something went wrong" is almost as bad as a stack trace (both tell the user nothing). The right answer: honest, specific, action-oriented. "Couldn't save your changes — looks like you're offline. We'll retry automatically when you reconnect."

**Empty states are marketing.** The empty state is often the first thing a new user sees. Don't waste it on a generic illustration. Teach the user the value proposition and point them at the primary CTA.

## VI.5 Copy & Voice

Write all copy with a deliberate voice — extracted from V.1's tone adjectives. One page, `docs/42-voice.md`:

- **Voice principles.** Concrete do's and don'ts. "We use contractions. We don't use 'please' more than once per screen. We avoid exclamation marks outside errors. We don't anthropomorphize the app ('I'll help you'; it's a recipe app, not a concierge)."
- **Tense and perspective.** Usually second-person present ("Add a recipe"). First-person plural ("We couldn't reach the server") when the app takes responsibility. Avoid slipping between them.
- **Empty/error/success copy.** Patterns, not one-offs. "Nothing here yet" / "That didn't work" / "Saved."
- **CTAs.** Imperative verbs: "Add," "Save," "Delete," "Continue." Not "Click here," not "Go."
- **Time and dates.** Relative ("2 hours ago") for recent; absolute for older. Respect user locale.
- **Numbers.** Localized formatting (commas/periods, currency symbols). Rounding rules consistent across views.

Do a pass at the end of Stage 8 where every string in the app is reviewed against the voice doc. Inconsistencies caught here cost nothing; inconsistencies caught post-ship require a release.

## VI.6 Accessibility from Day Zero

Accessibility is not a Stage 9 audit. It is Stage 5 design and Stage 8 implementation. Adding it later is 5–10× more expensive than building it in.

**The baseline (WCAG 2.1 AA) in design:**
- Every color pairing passes contrast (Stage 4 already enforced this).
- No information conveyed by color alone (icons, labels, patterns double-encode).
- Every interactive element is reachable by keyboard.
- Every interactive element has a visible focus indicator.
- Every form input has a label (visible or programmatically associated).
- Every image has alt text or is marked decorative.
- Every button/link has a clear, descriptive name.
- Every dynamic region (toasts, live updates) is announced to screen readers.
- Every error is announced and associated with the relevant input.
- No content relies on hover-only affordances.
- No content depends on sensory instructions ("tap the red button" — not accessible to screen readers or color-blind users).
- Motion can be disabled via OS preference.
- Heading hierarchy is semantically correct (h1 once per page, h2s subsections, no skipping levels).

These are enforced in Stage 5 by writing the screen inventory with accessibility attributes inline. "Recipe title — h2, serves as the primary heading, reads first to screen readers."

**Dynamic concerns (enforced in Stage 8):**
- Focus management on navigation (where does focus land after a modal opens/closes?).
- Live region announcements for async state (loading, errors, toasts).
- Proper ARIA on custom interactive widgets (disclosure, tabs, comboboxes, menus). Prefer native HTML controls; reach for ARIA only when no native element fits.
- Skip links for keyboard users on screens with lots of repetitive content.

**AAA goals (where relevant).** For regulated or public-service apps, aim higher than AA. For a hobby app, AA is often sufficient. Make the decision explicitly and document it.

## VI.7 Gate 5: UX Walkthrough

- [ ] `docs/40-navigation.md` — primary navigation pattern, global elements, entry points.
- [ ] `docs/41-flows.md` — a flow per user story, with happy path and branches.
- [ ] `docs/42-voice.md` — voice principles, patterns, CTA conventions.
- [ ] Screen inventory exists with every screen named, purpose stated, state matrix filled.
- [ ] Every screen has defined: empty, loading, error, and (where applicable) offline, stale, and filtered-empty states.
- [ ] Accessibility requirements are embedded in the screen inventory, not deferred.
- [ ] Claude has performed the adversarial walkthrough: pick a user story, trace it through the screens in the order a real user would, checking for missing transitions, orphan screens, dead-ends, and unresolvable error states.

**The adversarial walkthrough is the gate's teeth.** In the walkthrough, Claude imagines a hostile user: one who taps everything, loses connectivity at the worst moment, has a screen reader, rotates the device, backgrounds the app mid-flow. Every path the hostile user takes must resolve to a coherent state. If the walkthrough reveals a hole, fix the hole before proceeding.

---

# Part VII — Stage 6: Project Scaffolding

> **Goal of this stage.** Bootstrap the repository with the structure, tooling, configuration, and CI pipeline such that every commit from this point onward runs through the quality gates automatically. The scaffolding is the safety net for everything that follows.

## VII.1 Repository Structure

The structure reflects Stage 3's architecture choice. For a Next.js monolith, a typical structure:

```
project-root/
├── README.md
├── LICENSE
├── .gitignore
├── .editorconfig
├── .nvmrc  (or .tool-versions, .python-version)
├── package.json
├── tsconfig.json
├── .env.example
├── docs/
│   ├── 00-brief.md ... 42-voice.md
│   ├── adr/
│   ├── runbooks/
│   └── decisions.md  (symlink or copy of DECISIONS.md at root)
├── DECISIONS.md
├── ASSUMPTIONS.md
├── FUTURE.md
├── CHANGELOG.md
├── src/
│   ├── app/            (routes, or pages/)
│   ├── components/     (UI components, organized by feature or type)
│   ├── design-tokens/  (tokens, CSS vars, Tailwind config)
│   ├── lib/            (non-UI utilities, API clients)
│   ├── server/         (server-only code: actions, handlers, db access)
│   ├── hooks/          (React hooks or equivalent)
│   ├── styles/         (global styles)
│   └── types/          (shared TypeScript types)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/            (build, deploy, data migration scripts)
├── public/             (static assets)
└── .github/workflows/  (or .gitlab-ci.yml, etc.)
```

For a native mobile app, a Kotlin app, a CLI, the structure differs but the principle is the same: **predictable, flat-where-possible, deep-where-meaningful**. Every top-level directory has a single purpose that can be stated in one sentence.

**Anti-patterns:**
- Generic folders (`utils/`, `helpers/`, `common/`) that become dumping grounds.
- Folders one level deep containing a single file.
- "Logic lives in pages" — business logic mixed into routing files.
- Unexplained namespacing (`/legacy/`, `/v2/` — either explain or clean up).

**Repository metadata files (create all on first commit):**
- `README.md`: a useful README. See VII.1.1.
- `LICENSE`: pick one deliberately. MIT for maximum openness; Apache 2.0 if patent concerns; AGPL if copyleft-for-SaaS matters; proprietary notice if closed-source. Don't default to MIT without thinking.
- `.gitignore`: language-appropriate defaults plus `.env`, `.env.local`, build outputs, editor files.
- `.editorconfig`: enforce basic consistency (indent, line endings, final newline) across editors.
- `CODEOWNERS` (for GitHub): even on solo projects, useful for future collaborators.
- `CONTRIBUTING.md`: if ever open-sourced, this matters. Optional at v1.
- `CHANGELOG.md`: start from day one. Keep a Changelog format or conventional commits.

### VII.1.1 The README

A README must answer:
1. What is this?
2. Who is it for?
3. How do I run it locally?
4. How do I deploy it?
5. Where's the documentation?
6. How do I get help?

Skip marketing fluff. The README is for engineers (and future Claude). Max 200 lines; longer content goes into `docs/`.

## VII.2 Tooling Baseline

**Package manager.** Pick one, document in README. For JS: npm (default), pnpm (faster, better for monorepos), yarn (established but less common now). For Python: uv (fast, modern) or poetry. For Rust: cargo. Lock files are committed.

**Language version pinning.** `.nvmrc` or `.tool-versions` at root. CI uses the same version. No "works on my machine" variance.

**Formatter.** Zero-config style enforcement. Prettier for JS/TS/CSS/HTML/JSON/MD. Black for Python. rustfmt for Rust. ktlint for Kotlin. Configure minimally; defaults are usually fine.

**Linter.** ESLint for JS/TS with a strict config (`@typescript-eslint/strict`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`). ruff for Python (faster and replaces flake8, isort, pyupgrade). clippy for Rust. detekt for Kotlin.

**Type checker.** Configure strict mode. `tsconfig.json` with `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, `"exactOptionalPropertyTypes": true`. mypy/pyright with strict mode in Python.

**Test runner.** Vitest or Jest for JS. pytest for Python. cargo test for Rust. JUnit + MockK for Kotlin. Pick one and make it the single entry point for all test runs.

**Commit hooks.** Husky + lint-staged for JS. pre-commit for Python. Run: formatter, linter, type-check (or at least type-check on affected files) on every commit. If the hooks are slow, make them fast — slow hooks get bypassed.

**Dependency management.** Committed lockfile. A `renovate.json` or `dependabot.yml` for automated upgrades. For v1, weekly PRs are enough.

## VII.3 Environment Configuration

**The pattern.** Every secret, every environment-specific value, every toggle lives in environment variables. Loaded through a single module (`src/lib/config.ts` or `src/config.py`) that validates them on startup.

```ts
// src/lib/config.ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  // ...
});

export const env = EnvSchema.parse(process.env);
```

**What this buys:**
- Startup fails fast if a required env var is missing or malformed. No runtime surprises at 3 AM.
- The schema is the single authoritative list of env vars.
- Autocomplete and type safety everywhere the config is used.

**`.env.example` is committed.** `.env` and `.env.local` are git-ignored. The example is a copy of every variable with placeholder values so a new dev (or a new CI job, or Claude in a future session) knows what's needed.

**Never check real secrets into git, even in private repos.** Secret rotation after accidental commits is painful; preventing them is trivial.

## VII.4 CI/CD Foundations

A minimal CI pipeline that runs on every push:

1. **Install** — cached dependencies.
2. **Format check** — fail if un-formatted code is committed.
3. **Lint** — fail on errors, warn on warnings (configurable per project).
4. **Type check** — fail on any type error.
5. **Test (unit + integration)** — fail on any test failure.
6. **Build** — fail if the production build doesn't compile.
7. **Bundle size check** (for web) — fail if bundle grows beyond budget.
8. **Security audit** — fail on critical vulnerabilities in dependencies.

For GitHub Actions, this is a single YAML file (~80 lines). For GitLab CI, Circle, etc., equivalent. The pipeline runs in <5 minutes for a healthy v1 project; if it runs longer, prune it (move e2e to a separate workflow, parallelize, cache more aggressively).

**CD (deploy)** branches:
- Default strategy: PR merge to `main` triggers a production deploy (or staging → production with a manual promotion).
- Preview deploys on every PR for reviewability. Most managed platforms do this for free.
- A deploy workflow writes the git SHA into the deployed bundle so the running app can report its own version.

## VII.5 Pre-Commit Discipline

Commit messages follow a consistent format. Recommended: [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(recipes): add scaling control to recipe detail
fix(auth): correctly invalidate session on password change
chore(deps): upgrade next from 15.0.0 to 15.1.0
docs(adr): add ADR 012 for analytics choice
```

Benefits:
- Machine-readable (automated changelog generation).
- Forces thinking about scope per commit.
- Makes `git log` useful.

Commits should be small, self-contained, and revertable. A commit that touches 30 files across 8 concerns is a commit that will never be reverted cleanly.

Branch strategy for a solo autonomous build: **trunk-based with short-lived feature branches.** Main is always shippable. Feature branches live <2 days. PRs exist even solo, for a moment of self-review before merging (read your own diff — you'll find bugs).

## VII.6 Gate 6: Green-Build Baseline

- [ ] Repo initialized with structure, LICENSE, .gitignore, README.
- [ ] Package manager chosen and lockfile committed.
- [ ] Formatter, linter, type checker all configured and running clean on an empty scaffold.
- [ ] `.env.example` committed; `config.ts` (or equivalent) validates env on startup.
- [ ] CI pipeline exists and passes on an empty/hello-world scaffold.
- [ ] First deploy to a staging environment succeeds (even if the app is just "hello world").
- [ ] Deploy workflow is documented in `docs/runbooks/deploy.md`.
- [ ] Rollback procedure documented (even if it's just "click 'Revert' in Vercel").
- [ ] Commit a "Hello, Stage 7" commit. The Gate 6 baseline is the point from which all future builds are measured.

This stage is short but load-bearing. Skipping it is the dominant cause of autonomous builds that "work for Claude but break on deploy."

---

# Part VIII — Stage 7: Implementation Playbook

> **Goal of this stage.** Turn the PRD, architecture, design system, and UX flows into working code. This is the longest, highest-volume stage. The discipline here is what separates apps that ship as professional products from apps that ship as demonstrations.

The temptation at this stage is to "just build." The correction is that implementation is not a monolith — it's a sequence of well-formed slices, each of which passes its own quality bar before the next begins.

## VIII.1 Vertical Slicing

**The principle.** Build features as vertical slices: one user story, end-to-end, from UI to database (or equivalent), shippable on its own. Do not build the database schema first, then the API, then the UI. That's horizontal slicing, and it means nothing is shippable until everything is done.

**The slicing unit.** One user story from Stage III.2 = one slice. A slice includes:
- The UI (all states: happy, empty, loading, error, edge).
- The client-side logic.
- The API/server endpoints.
- The data layer changes (schema migration, if needed).
- Tests at all levels.
- Accessibility.
- Analytics/observability hooks.

A slice is "done" when it can be used by the target user from cold start to task completion. Not "UI done, waiting on backend" — done.

**The sequencing.** Order slices by:
1. **Foundations first.** Auth (if the app has accounts), the data model's core entities, the shell navigation. These unblock everything else.
2. **Highest-risk next.** The slice with the most unknowns or the most integration risk. Failing early is cheap; failing late is expensive.
3. **Highest-value next.** The slice that makes the app demonstrably useful. Skip to the "wow" feature early.
4. **Fill-in-the-rest.** Supporting features, polish.

Document the sequence in `docs/50-slice-order.md` and update as reality diverges from the plan.

**Slice size.** A slice should be completable in a focused session of a few hours. Slices that balloon to days of work are actually two slices that got stuck together — decompose them. Slices that finish in 20 minutes are fine; they were well-factored.

## VIII.2 Frontend Implementation

The frontend is where the design system meets the user's device. The goal is code that is consistent with the design system (Stage 4) and coherent with the UX flows (Stage 5), not a one-off.

**The component hierarchy.**
- **Primitives** — atomic, purely presentational. Button, Input, Icon, Text, Box/Stack. Driven by design tokens. No business logic. No API calls.
- **Composites** — combinations of primitives that have a coherent role. Card, Modal, Dropdown, FormField. Still no business logic.
- **Feature components** — specific to a user story. RecipeCard, IngredientList, ServingControl. May load data. May own local state. Compose composites.
- **Pages/routes** — route-level components. Compose feature components. Own page-level data loading and route params.

Never skip a level. Pages should not compose primitives directly (except for layout); they compose feature components. Feature components should not re-define primitive concerns (spacing, color) — those come from tokens and composites.

**File organization per component.**

```
Button/
├── Button.tsx
├── Button.module.css  (or inline with Tailwind, CSS-in-JS)
├── Button.test.tsx
├── Button.stories.tsx (if using Storybook/equivalent)
└── index.ts
```

For small primitives, one file is fine. For composites and up, split.

**Component authoring rules.**

- **Props are a contract.** Every prop is documented via TypeScript types. Optional props have defaults. Boolean props prefer affirmative names (`disabled`, not `enabled`). Variant props use union types (`variant: "primary" | "secondary" | "ghost"`), not booleans stacked (don't make `isPrimary`, `isSecondary`, `isGhost`).

- **No prop-drilling beyond two levels.** If a prop is being passed through multiple layers, use context (React Context, provide/inject, etc.) or state management. But prefer colocation: put state where it's used.

- **Compound components for complex UIs.** `<Modal>`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>` is often better than a single `<Modal title="X" body="Y" footer="Z" />`. The compound API is flexible and discoverable.

- **Headless components or primitives first.** For complex UI (comboboxes, menus, date pickers, dialogs), use a headless library (Radix UI, Headless UI, Ark UI) for a11y and behavior, and style with the design system. Writing these from scratch is rarely the right investment at v1.

- **No inline styles except for dynamic computed values** (e.g., translating a drag position). Everything else goes through the token system and the styling layer.

- **Never mix local state management patterns within one component.** If the component uses context for some state and props for other state, it's reading confusing. Pick one model per concern.

**Styling strategy.** Pick one and apply consistently:
- **CSS Modules** with design-token CSS variables — explicit, simple, works everywhere, no runtime cost.
- **Tailwind** with design-token CSS variables aliased via `tailwind.config` — fast iteration, needs token discipline or becomes chaotic.
- **CSS-in-JS** (emotion, styled-components, vanilla-extract) — powerful but carries runtime or build costs.
- **Native platform styling** (SwiftUI modifiers, Compose modifiers) — for native apps, use the platform's idiomatic styling.

Mixing styling strategies within one project is noise. Pick on Stage 6 and hold.

**Rendering strategy (web).**
- **Static / SSG** — content that doesn't change per-user (landing pages, marketing). Fastest. Cached at CDN.
- **Server-rendered (SSR)** — content that is personalized on first paint (logged-in dashboards). Slower TTFB but better perceived performance than pure CSR.
- **Client-rendered (CSR)** — highly interactive apps where the initial shell doesn't need to show personalized content. SPA feel.
- **Hybrid** (Next.js App Router, Remix) — route-level choice. Most common in 2026.
- **Islands** (Astro, Qwik) — static shell + interactive islands. Great for content-heavy apps with pockets of interactivity.

Choose per-route, not per-app. A "/blog/" route is SSG; a "/dashboard/" route is SSR or CSR; a "/settings/" route is CSR.

**Data fetching patterns.**
- Use the framework's idiomatic data-loading pattern (loader functions, RSC fetches, hooks with query libraries). Don't combine two patterns on the same route.
- For client-side data libraries, use TanStack Query, SWR, or equivalent. They handle caching, deduplication, stale-while-revalidate, and retries. Writing this logic by hand is a waste.
- Request cancellation on unmount / navigation away is critical. Most query libraries handle this; verify it's wired correctly.
- Optimistic updates for user actions that have predictable outcomes. Revert on failure; always keep the user's intent as the "truth" until the server disagrees.

**Form handling.**
- Use a form library (react-hook-form, Formik, Vue's `useForm`, SwiftUI bindings) rather than hand-rolling.
- Schema-driven validation (Zod, Yup, Valibot) ensures the client-side check matches what the server expects. Share the schema if possible.
- Inline errors on blur or submit; don't error on every keystroke. Errors need to be announced to screen readers.
- Disable submit during submission; show the loading state; handle success (redirect, clear, toast) and failure (specific message, keep data, allow retry).
- Preserve data across navigation where it makes sense. Nothing is more infuriating than losing a form.

## VIII.3 Backend Implementation

**Principles.**

- **Every route has a defined shape.** Input schema (body, params, query), output schema, error types. If using TypeScript, generate these types; if Python, use Pydantic; if Rust, use serde + typed structs. Never hand-parse.

- **Validate at the edge.** Every request body, every query param, every header that matters is validated before any business logic. Reject invalid input with a clear error. Bad: "accept anything, trust the client."

- **Authorization per route.** Every non-public route checks: (1) authenticated? (2) authorized for this specific resource? Don't rely on "only logged-in users have this URL" — URLs leak.

- **Pure business logic separated from framework.** The core logic (the thing that computes, transforms, decides) should not import framework-specific concerns. This makes it testable without a server and portable if the framework changes.

- **Services, not god files.** Group related business logic into cohesive modules (`services/auth.ts`, `services/recipes.ts`). Each service has a narrow public API. Routes call services.

- **Database access through a data layer.** Never sprinkle raw SQL or ORM calls across routes and services. Have a `repositories/` or `queries/` layer that abstracts data access. This allows refactoring storage without rewriting business logic.

**Error handling.**

- **Structured errors.** A base `AppError` with `code`, `message`, `status` (HTTP), `cause` (original error), `context` (data useful for debugging). Specific subclasses: `ValidationError`, `NotFoundError`, `AuthError`, `ExternalServiceError`.
- **One error boundary at the framework layer.** Catches all errors, logs them with structured context, returns the right HTTP response to the client. Never leaks stack traces or internal messages.
- **Client-facing error messages are sanitized.** "Invalid email format" is fine; "DB error: ERROR: duplicate key value violates unique constraint" is not.

**Idempotency.** Any operation a client might retry (because of timeouts, flaky networks) should be idempotent or have an explicit idempotency key. Critical for payment, messaging, order placement. Not necessary for a read endpoint; highly necessary for any write that matters.

**Pagination.** Default to cursor-based pagination for anything that might grow. Offset pagination breaks under concurrent insertions and is slow at depth. For small, bounded lists, no pagination is fine; just don't default to it.

**Rate limiting.** At minimum, per-IP rate limits on unauthenticated endpoints to mitigate scraping and abuse. Per-user rate limits on expensive operations. The hosting platform often provides basic rate limiting; augment where needed.

## VIII.4 Data Layer

**Migrations are code.** Every schema change is a versioned, committed, reversible migration. Never edit the schema directly in a production database. Use the ORM's migration tool (Prisma, Drizzle, Django migrations, Rails migrations, Alembic) or a standalone tool (Flyway, Liquibase, goose, dbmate).

**Migrations are small.** One conceptual change per migration. Don't bundle "add column, drop column, rename table" into one file — if one fails, the others don't.

**Migrations are backwards-compatible during deploy.** The app and the schema evolve together, but not atomically. The sequence for breaking schema changes:

1. Add the new column / table / index (forward-compatible; old app code still works).
2. Deploy app code that writes to both old and new.
3. Backfill the new from the old.
4. Deploy app code that reads only from the new.
5. Remove the old column / table.

Skipping steps causes downtime or data loss.

**Queries.**

- Use indexes for every WHERE and ORDER BY column that runs frequently. Verify with EXPLAIN.
- N+1 queries are the #1 performance killer. Use joins, eager loading, or dataloaders.
- Raw SQL is fine when the ORM can't express what you need. Use parameterized queries always; never string-concat.
- Long-running queries timeout explicitly. A runaway query should fail fast, not block a connection pool.

**Transactions.**

- Wrap multi-step writes in a transaction if consistency matters.
- Keep transactions short — they hold locks.
- Never call external services inside a transaction.

**Soft delete vs hard delete.** Pick per-entity. User-facing content (recipes, posts, comments) often wants soft delete so restore is possible. Infrastructure data (sessions, caches) wants hard delete. Financial records often cannot be deleted at all; they're archived.

**Backups.**
- Automated daily backups to a separate region or account.
- Periodic restore tests (quarterly, minimum). An untested backup is a bet, not a safeguard.
- Documented restore procedure in `docs/runbooks/backup-restore.md`.
- Retention policy aligned with regulatory requirements (GDPR "right to erasure" means you need to actually be able to erase, including from backups — or have a defensible policy).

## VIII.5 Integration Layer

Every external service call goes through a thin client module. Never inline HTTP requests in business logic.

```ts
// src/lib/integrations/stripe/client.ts
export class StripeClient {
  constructor(private config: StripeConfig) {}

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    // validation, call, error normalization, logging
  }

  // ...
}

// src/lib/integrations/stripe/index.ts
export const stripe = new StripeClient(env.STRIPE_CONFIG);
```

**Why a wrapper:**
- Centralized auth (the API key lives in one place).
- Centralized error handling (rate limits, 5xx, timeouts all mapped to `ExternalServiceError`).
- Centralized retries with backoff on retryable errors.
- Replaceable — swap the SDK or the service without touching callers.
- Testable — mock the client in tests.

**Retry and circuit-breaker.** Retryable errors (5xx, 429, network) get exponential backoff retries (3–5 attempts, jitter). Non-retryable errors (4xx) fail fast. If a service is down for an extended period, a circuit breaker trips to avoid drowning it when it comes back.

**Webhooks from external services.** Verify signatures. Never trust the payload without signature verification. Idempotent handlers (webhooks retry). Acknowledge fast (return 200 immediately), queue the actual work.

**LLM integrations** (if applicable). Same discipline:
- Wrapper client with auth, retries, timeout.
- Prompt templates versioned in source control — never hard-coded strings scattered across the codebase.
- Output parsing defensive — LLMs return unexpected shapes.
- Cost telemetry — track token usage per feature so you know what it costs.
- User-facing failure modes — what happens if the LLM is slow or down? Fallbacks, degraded UX, retries.

## VIII.6 Authentication & Authorization

**Authentication.** Unless the app is a local-only tool, the user has an identity. Options:

- **Managed auth service** (Clerk, Auth0, Supabase Auth, Firebase Auth, NextAuth/Auth.js with providers). Fastest path; handles sessions, OAuth, MFA, password recovery, email verification. Recommended default for v1 unless you have a strong reason otherwise.
- **Roll-your-own.** Sometimes unavoidable (for offline-first, for specific compliance requirements, for highly custom flows). Then:
  - Password hashing with argon2id or bcrypt, never sha-*.
  - Email verification for new signups.
  - Session tokens that are long (>=32 bytes of randomness), server-side storable, revocable.
  - CSRF protection on state-changing requests.
  - Secure cookies (HttpOnly, Secure, SameSite=Lax or Strict).
  - Rate limiting on login, signup, and password-reset endpoints.
  - MFA available, even if optional at v1.

**Authorization.** The structure depends on the app's permission model. For a simple app:

- **Ownership check.** For every resource, "is the requesting user the owner?" If yes, access; if no, 403 or 404 depending on leak-sensitivity.
- **Roles.** If multiple user types exist (admin, editor, viewer), define them explicitly. Don't check role with string equality everywhere; centralize the check.

For a more complex app:
- **RBAC** (roles + permissions).
- **ABAC** (policies based on attributes of user, resource, environment).
- **ReBAC** (who is "related" to the resource? direct owner, shared with, part of a group, etc.).

Pick the minimum model that fits the product. Upgrade when the product demands it. Log Tier-2 decision in the Registry.

**Session management.** Expiry, renewal, revocation. What happens when the user changes password? (All sessions invalidated.) What happens when the user signs out? (This session's token invalidated server-side, not just client-side.) What happens when a session is stolen? (Revoke from admin/security UI.)

## VIII.7 State Management

**The hierarchy of state.**

1. **URL state** — the page, the selected tab, the filters applied, the item being viewed. URL is the source of truth for anything a user might share, bookmark, or refresh. If a state belongs in the URL and isn't, the app is broken.

2. **Server state** — data fetched from the backend. Owned by a query library (TanStack Query, SWR, Apollo). Don't copy server state into local state; derive.

3. **Form state** — temporary state of an in-progress edit. Owned by a form library.

4. **UI state** — is the menu open? Is the modal shown? Is this row selected? Local to the component, usually `useState` or `useReducer`.

5. **Shared client state** — state needed by multiple components that isn't URL, server, or form. Use context, Zustand, Jotai, Redux, Pinia, etc. Be sparing — most "shared" state is actually URL state or server state in disguise.

**Rule of thumb:** if you can't decide which bucket a piece of state goes in, you haven't thought about it enough. State is where bugs live; categorizing it is the first step to eliminating bugs.

## VIII.8 Error Handling Architecture

Errors happen at every layer. Have a plan for each:

**In components.** An Error Boundary around the route and around any feature component that can fail independently. The boundary renders a meaningful error UI (per Stage VI.4) and reports to the error tracking service. Don't swallow errors silently.

**In async logic (queries, mutations, async functions).** Explicit try/catch or equivalent. Errors propagate upward, get caught by the boundary or form's error handler, and get shown to the user in a state that matches Stage VI.4.

**In background tasks.** No user is watching. Log with full context. Retry if transient. Alert if persistent. Never lose data silently.

**In the server.** The route-level error boundary catches, logs, and returns the right HTTP status. The client interprets the status and shows the right error UI.

**In third-party calls.** The integration wrapper normalizes third-party errors to your app's error taxonomy.

**The rule.** No error is ever "just swallowed." Every error is either (a) recovered from gracefully (log + continue), (b) reported to the user with a clear next action, or (c) escalated to the error tracking service for out-of-band attention.

## VIII.9 Internationalization

Even if launching in one language, structure the code for i18n now. It's 5× cheaper than retrofitting.

- **All user-facing strings in a lookup table** (`t("recipe.scaleButton")`, not inline `"Scale"`). Use i18next, Lingui, FormatJS, or the native platform i18n.
- **Plurals, genders, dates, numbers use the i18n library's helpers.** Never string-concatenate "You have " + count + " items" — plural rules vary by language.
- **Layout tolerates longer translations.** German is ~30% longer than English. Arabic and Hebrew are RTL. Design doesn't break in any locale.
- **Locale detection:** browser preference, then URL subpath (`/fr/`, `/en/`) or cookie override.
- **Locale fallback:** missing keys in one locale fall back to the default locale, never show the key.

Even a single-locale app benefits from this pattern: it makes copy-review exhaustive (one file has every string), it makes A/B testing copy easier, and it readies v2 for expansion.

## VIII.10 Gate 7: Feature-Complete

Gate met when:

- [ ] Every user story from the PRD has a working, tested implementation.
- [ ] Every screen from the inventory has all its defined states implemented.
- [ ] Every acceptance criterion has at least one automated test that asserts it.
- [ ] No TODO, FIXME, or commented-out code remains in shipped paths. (TODOs for future work are fine if tracked in `FUTURE.md`, not scattered.)
- [ ] The design system preview renders every component variant correctly.
- [ ] Lint, format, type-check, and all tests pass in CI.
- [ ] Bundle size is within the budget defined in Stage III.5.
- [ ] `npm audit` / equivalent shows no critical vulnerabilities.
- [ ] The Decision Registry and Assumption Ledger are current.

Adversarial review:
- Run through each user story as a real user. Did anything feel wrong?
- Open the app on the smallest reasonable mobile device. Does it work?
- Disconnect from the network. What happens?
- Open the app with keyboard-only navigation. Can you do everything?
- Open the app with a screen reader (VoiceOver or NVDA). Does it make sense?
- Open the app with browser dev tools throttling to slow 3G and mid-tier CPU. Is it still usable?

Each of these is a trivial check that catches issues which would take weeks to surface in production.

---

# Part IX — Stage 8: Quality Engineering

> **Goal of this stage.** Prove that the built app meets the defined quality bar — not by intuition or spot-checking, but by systematic testing, auditing, and measurement. This is where Claude adversarially validates its own work.

Quality engineering is not a phase that happens at the end. Tests are written with features; accessibility is designed in; performance is budgeted from the start. But this stage is where those disciplines are consolidated, gaps are found, and the evidence that the quality bar is met is produced.

## IX.1 Test Pyramid

**Many cheap tests at the bottom, few expensive tests at the top.** Specifically:

- **Many unit tests.** Fast (<10ms each), isolated, deterministic. Test pure functions, business logic, utilities, individual components' rendering.
- **Moderate integration tests.** Slower (tens to hundreds of ms). Test how units combine. API route + database. Component + its data hook. Multiple components in a feature.
- **Few end-to-end tests.** Slow (seconds each). Test the entire stack as a user. Use for the critical user journeys only — signup, core value action, payment. Not for "does this button change color on hover."

Typical distribution for a v1 app: 70% unit, 20% integration, 10% e2e. The exact ratios matter less than the *shape* — if e2e tests dominate, feedback is slow; if unit tests dominate without integration, integration bugs escape.

## IX.2 Unit Testing

**What to test.**

- Pure functions: every branch, every edge case, every boundary.
- Components: rendering in each state (default, loading, empty, error, success), interaction (clicks, typing, keyboard), accessibility (roles, names, focus behavior).
- Hooks / composables: state transitions, side effects.
- Error paths: do errors propagate correctly? Are they typed correctly?

**What not to test.**

- The framework itself. Don't test that `useState` works; trust React.
- The library. Don't test Zod's validation logic; trust Zod.
- Implementation details. Don't assert on internal state variables; assert on observable behavior.

**The good test.**

```ts
test("scaleIngredient scales quantity proportionally and preserves unit", () => {
  expect(scaleIngredient({ qty: 2, unit: "cups" }, 1.5))
    .toEqual({ qty: 3, unit: "cups" });
});

test("scaleIngredient rounds fractional cups to sensible fractions", () => {
  expect(scaleIngredient({ qty: 1, unit: "cup" }, 0.666))
    .toEqual({ qty: 2/3, unit: "cup" });
});
```

Named descriptively. Tests one thing. Observable outcome asserted. No mocks unless testing the boundary with a mockable dependency.

**Coverage.**

Aim for high coverage on business logic (>90% line coverage, >85% branch coverage). Don't chase 100% — that path leads to testing-for-testing's-sake. On UI components, aim for behavioral coverage (every prop variant, every state) rather than line coverage.

Exclude from coverage: generated code, type definition files, build configuration, vendored third-party code.

**Mutation testing.** For business-critical logic (billing, security, core algorithms), run a mutation testing tool (Stryker for JS, mutmut for Python). If tests pass under mutation, the test is asserting something weak. Rare at v1 but worth it for high-stakes code.

## IX.3 Integration Testing

Integration tests exercise the seams between units. They are slower and more brittle than unit tests, but they catch bugs unit tests structurally can't.

**Common integration test targets:**

- **API route + database.** Hit the endpoint; verify the right records exist. Use a test database (preferably one spun up per test file or per test suite).
- **Data layer + migrations.** Apply migrations on an empty database; load fixtures; run queries; assert results.
- **Auth flow.** Signup → verify email → login → access a protected resource. End-to-end within the backend.
- **Webhook handlers.** Simulate the third-party's payload; verify side effects (database writes, queue messages).
- **Feature component + data hook + query library.** Render the component; mock the HTTP layer; verify the user-visible behavior.

**Setup and teardown.** Each integration test starts from a known state. Either: spin up a fresh environment per test (slow but bulletproof), reset state between tests (fast but requires discipline), or use test isolation tricks like transaction rollback (fast and clean, if your framework supports it).

**Flaky tests are banned.** A flaky test is a worse signal than no test — it trains the team to ignore failures. If an integration test is flaky: fix it or delete it. Never tolerate.

## IX.4 End-to-End Testing

**Keep the e2e suite small.** The goal is not "test everything e2e" — that's the pyramid inverted. The goal is to cover the critical paths a user takes to get value from the app.

For a typical app:
- Signup + first-time onboarding.
- Core value loop (the one thing the user mainly does).
- Authentication edge: login, logout, password reset.
- Payment flow (if applicable).
- Checkout / order / submit (if applicable).

5–15 e2e tests for a v1 app is a reasonable range. More than that, and you're paying a disproportionate cost in runtime and flakiness.

**Tools.** Playwright (recommended — fast, reliable, great DX), Cypress, WebdriverIO. For mobile apps: Maestro, Detox. For React Native: Detox or Maestro.

**E2E hygiene:**
- Stable selectors. Use `data-testid` attributes, not CSS classes or text content (which both change with design tweaks).
- Independent tests. Each test sets up its own state; no test depends on another's side effects.
- Retries allowed (1 retry, max), but flaky tests are investigated.
- Record videos / traces on failure for debugging.
- Run in CI on every PR; don't gate every PR if they're too slow (can be a nightly job + pre-release job).

## IX.5 Accessibility Audit

Automated + manual. Both required.

**Automated tooling.**
- **axe-core** (via jest-axe, playwright-axe, or the browser extension). Catches 30–50% of WCAG violations automatically.
- **Lighthouse accessibility audit.** Broader but noisier than axe.
- **ESLint plugin jsx-a11y** (or equivalent for your framework). Catches many issues at dev time.

Run axe in CI. Fail the build on new violations.

**Manual tests (cannot be skipped).**
1. **Keyboard navigation.** Tab through every screen. Can you reach and operate every interactive element? Is the tab order logical? Is focus ever trapped? Is focus ever lost?
2. **Screen reader.** VoiceOver on macOS/iOS, NVDA on Windows, TalkBack on Android. Go through each user story. Does the screen reader convey the right information in the right order? Are dynamic updates announced?
3. **Zoom to 200%.** Does content reflow? Is any content clipped?
4. **High-contrast mode** (OS-level). Does the app remain usable?
5. **Reduced motion preference.** Are animations disabled or replaced with non-motion alternatives?
6. **Color-blind simulation.** Browser dev tools can simulate various types of color blindness. Check that no information is conveyed by color alone.

Document findings in `docs/60-accessibility-audit.md` with a severity rating. Fix critical and high before shipping. Document workarounds for any deferred items.

## IX.6 Performance Audit

**Synthetic measurement.**
- Lighthouse performance audit in CI on representative pages. Track Performance, Accessibility, Best Practices, and SEO scores over time.
- WebPageTest runs for the most important pages. Throttle CPU + network to realistic v1 user conditions.
- Bundle analysis. `next-bundle-analyzer`, `webpack-bundle-analyzer`, `vite-bundle-visualizer`, etc. Identify bloat: unused dependencies, duplicate code, heavy libraries.

**Core Web Vitals:**
- **LCP** (Largest Contentful Paint) < 2.5s.
- **INP** (Interaction to Next Paint) < 200ms.
- **CLS** (Cumulative Layout Shift) < 0.1.

Don't hit targets? Diagnose:
- **LCP slow:** LCP element is usually the hero image or the largest text block. Preload the image? Defer non-critical CSS? Server-render the initial view?
- **INP slow:** Long tasks on the main thread. Offload work to workers? Split bundles? Defer non-critical JS?
- **CLS high:** Images without reserved dimensions? Fonts causing FOUT swaps? Dynamically inserted content? Reserve space for anything that loads.

**Real-user monitoring.** After launch, measure actual Web Vitals from real users (via Google's web-vitals library, Sentry, Vercel Analytics, SpeedCurve, etc.). Synthetic tests don't reflect real devices and networks. RUM is ground truth.

**Budget enforcement.** Fail CI if bundle size exceeds budget by more than a configurable percentage. Fail CI if Lighthouse perf score drops below a threshold on representative pages. The budget is the floor; don't let it silently erode.

## IX.7 Security Audit

**Static checks (automated).**
- `npm audit` / `yarn audit` / `pnpm audit` / `cargo audit` / `pip-audit` / `bundle audit`. Run in CI.
- SAST tool (Snyk, SonarQube, Semgrep with OWASP rulesets). Configure relevant rules; review findings; suppress false positives with documented rationale.
- Secret scanning (`gitleaks`, `trufflehog`, GitHub's built-in). Pre-commit hook + CI.
- Dependency provenance. Check for typosquat packages; pin versions; avoid install scripts where possible.

**Dynamic checks (semi-automated).**
- Run OWASP ZAP or equivalent against a staging deploy. Flags common web vulnerabilities (XSS, injection, missing headers, etc.).
- Run Lighthouse's "best practices" audit — covers many common web misconfigurations.

**Manual checks.**
- **Authentication.** Can a user be logged in and then have their session persist after password change? Can an expired session be replayed? Can a password-reset token be used twice?
- **Authorization.** For every resource, can a user access it via a direct URL without going through the UI? Can they manipulate a client-side-only role and gain admin?
- **Input validation.** Every form, every query param, every header: fuzz with oversized inputs, unicode exotica, null bytes, SQL patterns, HTML/JS injection patterns.
- **CSRF.** State-changing requests require a CSRF token (or SameSite=Strict cookies + origin checks).
- **Headers.** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Use a tool like `securityheaders.com` for a quick scan of the deployed app.
- **TLS.** Grade with Qualys SSL Labs. Aim for A or A+. Disable legacy protocols (TLS < 1.2).
- **Secrets.** Grep the entire repo history for secret patterns (`sk_`, `AKIA`, `-----BEGIN`, `AIza`, etc.). `git log --all -p | grep ...`.
- **File uploads** (if the app has them). Are uploads size-limited? Type-checked (both extension and magic bytes)? Virus-scanned where appropriate? Stored out-of-band from web-served content?

**Findings document.** `docs/61-security-audit.md`. For each finding: severity, description, reproduction, remediation, status. Critical and high fixed before ship. Medium and low in `FUTURE.md` if deferred, with rationale.

## IX.8 Load & Stress Testing

**Not every app needs this at v1.** A private family app for 5 users does not. A public app for thousands does.

Decision criteria:
- Expected launch-day concurrent users > 100? → Load test.
- Any operation expected to run at >10 req/s? → Load test at 2–3× that rate.
- Any async/queued work? → Stress test with a backlog.
- Regulated workload with uptime SLAs? → Load + chaos test.

**Tools.** k6, Locust, Artillery, Vegeta. Pick one; write load scripts that simulate realistic traffic patterns (not just flat RPS — user arrivals, session depths, thinking time).

**What to measure:**
- Throughput at target load (requests completed per second).
- Latency (p50, p95, p99).
- Error rate.
- Resource utilization (CPU, memory, database connections, external service quotas).
- Behavior past capacity — does it degrade gracefully (slower) or catastrophically (errors, crashes)?

**Fail criteria:**
- Error rate > 1% under target load.
- p95 latency > NFR target under target load.
- Any resource saturated at <80% of target load (no headroom).

Report in `docs/62-load-test.md`.

## IX.9 Gate 8: Quality Bar

- [ ] Unit test coverage meets targets (business logic ≥90% line).
- [ ] Integration tests cover every API endpoint and every critical data flow.
- [ ] E2E tests cover every critical user journey.
- [ ] All tests pass in CI.
- [ ] Automated a11y scan is clean.
- [ ] Manual a11y audit is complete; findings are fixed or documented.
- [ ] Lighthouse performance score ≥ target on representative pages.
- [ ] Core Web Vitals within budget (LCP, INP, CLS).
- [ ] Security audit is complete; critical and high findings are fixed.
- [ ] Load test passes (if required).
- [ ] `docs/60-accessibility-audit.md`, `docs/61-security-audit.md`, `docs/62-load-test.md` (if applicable) exist.

If any item is unchecked, Stage 8 is not complete. Do not proceed to Stage 9. Do not ship.

---

# Part X — Stage 9: Observability & Telemetry

> **Goal of this stage.** Instrument the app so that after launch, Claude and the user can answer three categories of questions in real time: "is it healthy?", "is it being used?", and "what went wrong?" Without observability, you're flying blind and debugging reactively.

## X.1 Logging Architecture

**Structured logs, not printf.** Every log entry is a JSON object with at least:

```json
{
  "timestamp": "2026-04-22T14:32:11Z",
  "level": "info",
  "service": "api",
  "trace_id": "abc123",
  "user_id": "u_xyz",
  "event": "recipe.scaled",
  "recipe_id": "r_456",
  "old_servings": 4,
  "new_servings": 6,
  "duration_ms": 12
}
```

**Levels and their use:**
- `DEBUG` — diagnostic only, off in production.
- `INFO` — normal operation, notable events.
- `WARN` — something is wrong but the system recovered or continued. Alertable if frequent.
- `ERROR` — something failed. Alertable per occurrence.
- `FATAL` — the process can't continue. Alertable with page.

**Never log PII unless there's a strong reason and a documented retention policy.** User email addresses, names, location data, device identifiers — these require careful handling. Use opaque IDs (`user_id` is fine; `user_email` usually isn't).

**Never log secrets.** API keys, passwords (even hashed in some contexts), session tokens. Review logs before enabling them.

**One logging library.** pino for Node.js, structlog for Python, zerolog for Go, log4j2 for Java/Kotlin. Configure once, use everywhere. Ship logs to a central aggregator (Better Stack, Axiom, Datadog, Grafana Loki) via stdout + platform-provided log shipping.

## X.2 Metrics & SLIs

**Service Level Indicators (SLIs)** — the numbers that answer "is the service healthy?"

For a web/API service:
- **Availability.** Successful requests / total requests. Target: 99.5%+ at v1.
- **Latency.** p50, p95, p99 per endpoint. Per NFRs.
- **Error rate.** 5xx responses / total responses. Per endpoint and overall.
- **Saturation.** CPU, memory, database connection pool, external rate-limit headroom.

For a frontend:
- **Core Web Vitals** (see IX.6).
- **JavaScript error rate** (errors / sessions).

**Service Level Objectives (SLOs)** — the targets for SLIs.
- Example: "99.5% of API requests complete in under 500ms over rolling 28 days."
- Attainable, not aspirational. If you're at 99.2%, setting a 99.9% SLO is dishonest.

**Error budget.** SLO inverse. If your SLO is 99.5%, you have a 0.5% error budget per period. Spending faster than the budget → stop shipping features, invest in reliability. Spending slower → ship more aggressively.

**Metric tooling.** The platform you're on often provides basic metrics (Vercel, Railway, Fly, Render all have dashboards). For more, use Prometheus + Grafana (self-hosted), Datadog, Better Stack, New Relic. For simple apps, platform-native is often enough.

## X.3 Tracing

**Distributed tracing** becomes critical when a single user action spans multiple services or multiple async steps. Each trace has a unique ID; each span within the trace represents a unit of work (a request, a database query, a queue message).

OpenTelemetry is the industry standard. SDKs for every major language. Export to Jaeger, Tempo, Honeycomb, Datadog APM, Sentry Tracing.

**What to trace:**
- Every HTTP request (automatic with OTel instrumentation of the web framework).
- Every database query (automatic with OTel SQL instrumentation).
- Every external service call.
- Every major async task.

**What not to trace:**
- High-frequency low-value operations (every cache lookup — too much data).
- Operations covered by simpler metrics.

**Propagation.** Trace context propagates via HTTP headers (`traceparent`) between services. Verify propagation works end-to-end in a staging environment before relying on traces in production.

## X.4 Error Tracking

Separate from logging and metrics. Error tracking captures **exceptions with full context** (stack trace, user, browser, recent actions, breadcrumbs).

**Tools.** Sentry (industry default), Rollbar, Bugsnag, Honeybadger, Errsole (self-hostable), GlitchTip (FOSS Sentry-compatible).

**Integration points:**
- Frontend: catches uncaught exceptions, rejected promises, React errors via ErrorBoundary integration.
- Backend: catches uncaught exceptions, logged errors at ERROR level.
- Background jobs: catches job failures.

**Signal vs noise.** Every error reported should be actionable. If 90% of errors are "Network request failed" with no context, the signal is drowned. Configure:
- Ignore or group expected errors (auth errors from spammed login attempts, user-cancelled requests).
- Attach context: user ID, feature flag state, current route, recent breadcrumbs.
- Deduplicate aggressively — 100 users hitting the same error is one issue, not 100.
- Alert only on new or high-frequency issues, not every error.

**Source maps.** Upload source maps to the error tracker so stack traces are legible (mapped back to original source lines). Do not serve source maps publicly.

## X.5 Product Analytics

Product analytics is distinct from infrastructure observability. It answers "who uses what and how?" rather than "is it healthy?"

**Events to track at v1:**
- **Signup.** Who signed up, from where, on what device.
- **Activation.** When did the user accomplish the primary job-to-be-done for the first time? This is the most important funnel step.
- **Retention milestones.** Did they come back on Day 1, 7, 28?
- **Core actions.** The 3–5 actions that represent value being delivered.
- **Friction events.** Errors the user saw, abandonments mid-flow.

**Tools.** PostHog (open-source, self-hostable, privacy-friendly), Plausible (simple, privacy-first), Fathom, Amplitude, Mixpanel (more complex analytical UIs).

**Event naming.** Consistent convention. `verb_noun` or `noun.verb`. `signup_completed`, `recipe.scaled`, `payment_submitted`. Every event has documented properties.

**Event schema registry.** As the number of events grows, document them. `docs/70-events.md` with event name, description, properties, when it fires. Avoids event drift.

## X.6 Privacy-Respecting Telemetry

**The baseline.**
- No third-party trackers without user consent (GDPR in EU; CCPA in California; ePrivacy in EU; various others).
- Cookie banners that actually work (default: nothing set until consent; "Reject all" must be one click and equally prominent to "Accept all").
- IP anonymization where the analytics tool supports it.
- No cross-site tracking if you can help it.
- Data minimization: capture only what's necessary for product decisions.

**Privacy-first alternatives.** Plausible, Fathom, Umami, self-hosted PostHog — all ship without cross-site trackers and are GDPR-friendlier by default. For a v1 small app, one of these is usually the right choice over a heavyweight tool.

**Data export and deletion for users.** Under GDPR (and good UX in general), users can request their data. Build the ability to export a user's data on request and delete their data on request. Even if not immediately user-facing, have the admin/runbook version.

**Consent.** If the legal jurisdiction requires it (EU, UK), consent must be freely given, specific, informed, unambiguous. A pre-checked box is not consent. Document the consent flow.

## X.7 Gate 9: Observability Ready

- [ ] Structured logging is configured and shipping to an aggregator.
- [ ] Key SLIs are being measured and visible on a dashboard.
- [ ] SLO targets are defined in `docs/71-slos.md`.
- [ ] Error tracking is wired up on both frontend and backend.
- [ ] Source maps are uploaded on deploy.
- [ ] Product analytics events are firing for the key actions.
- [ ] Event schema is documented in `docs/70-events.md`.
- [ ] No PII or secrets are being logged or transmitted without consent.
- [ ] Consent flow (if required) is tested.
- [ ] Alerts for critical conditions (high error rate, downtime) route to a destination that will be seen (email, Slack, PagerDuty).

Adversarial review:
- Simulate a spike in 5xx errors. Does an alert fire?
- Simulate a runaway error loop. Does the error tracker deduplicate it or drown?
- Simulate a new user signing up. Can you trace their journey through the analytics?
- Reject all cookies as a user. Does the site still work? Is any tracking happening anyway?
- Request data deletion as a user. Can the app honor it?

---

# Part XI — Stage 10: Pre-Ship Hardening

> **Goal of this stage.** Verify that the app is shippable in the business, legal, and content sense — not just the technical sense. The audit here is boring but essential; it catches the things that cause 2 AM phone calls.

## XI.1 Code Freeze Rituals

Announce a code freeze to yourself (and collaborators, if any). From this point to ship, only bug fixes against stage-10 findings go in. No new features. No refactors that aren't remediations.

**The rituals:**
1. **Tag a release candidate.** `v1.0.0-rc1` or equivalent. Every subsequent fix during stage-10 is `-rc2`, `-rc3`.
2. **Run the full test suite.** Not just what CI runs on every PR — every test, including the slow ones, including e2e across all platforms/browsers.
3. **Run a production build locally.** Not development mode. Catch the bugs that only appear in production builds.
4. **Run a dry-run deploy to a staging environment** that is as close to production as possible. Smoke-test the critical paths.
5. **Run a full day on staging.** Let the background jobs run. Let sessions expire and renew. Let the cache evict naturally.

## XI.2 Legal & Compliance Sweep

**The non-negotiables (for most apps):**

- **Privacy Policy.** A document describing what data you collect, how you use it, how long you keep it, who you share it with, and how users can access, correct, delete their data. Required by GDPR (EU), CCPA (California), LGPD (Brazil), PIPEDA (Canada), and good practice everywhere. Use a generator as a starting point; have a human review.
- **Terms of Service** (or Terms of Use). What users can and can't do. Liability limitations. Dispute resolution. Generated starting point; human review.
- **Cookie Policy / Notice** if using cookies. Integrated with your consent mechanism.
- **Contact info.** A way to reach the operator for legal matters. Required under GDPR ("data protection contact") and most jurisdictions.

**Sector-specific:**

- **Health data:** HIPAA (US) if the app qualifies as a covered entity. Major additional obligations.
- **Children's data:** COPPA (US, under 13), GDPR-K (EU, under 16). Major additional obligations, including verifiable parental consent.
- **Financial data / payments:** PCI DSS if handling card data directly. Usually sidestepped by using Stripe/equivalent, which handles PCI scope.
- **Biometric data:** BIPA (Illinois) and similar laws. Written consent, retention limits.
- **Accessibility laws:** ADA (US), EAA (EU, 2025), AODA (Ontario), and others. WCAG compliance often legally required.

If any of these apply, **stop and ask.** Legal obligations are Tier-3 decisions.

**The legal sweep checklist:**
- [ ] Privacy Policy published and linked.
- [ ] Terms of Service published and linked.
- [ ] Cookie consent (if needed) functional.
- [ ] Contact/data-protection info published.
- [ ] Sector-specific obligations identified and met or explicitly deferred.
- [ ] Data retention policy documented and implemented.
- [ ] Data deletion on user request implemented.
- [ ] Data export on user request implemented.

## XI.3 Licenses & Attribution

**Your license.** You decided this in Stage 6. Verify `LICENSE` is in the repo and linked from the README.

**Third-party licenses.** Every dependency your app ships with has a license. Many require attribution.

- **Permissive** (MIT, BSD, Apache 2.0) — usually require a notice somewhere. Bundling a `NOTICE` or `THIRD-PARTY-LICENSES.md` file usually suffices.
- **Copyleft** (GPL, AGPL, MPL) — check the specific requirements. AGPL-licensed server code that's modified must make source available to network users.
- **Non-commercial** or **"source-available"** licenses — restrict usage. Check compatibility with your app's model.

Tools: `license-checker` (npm), `pip-licenses` (python), `cargo-license` (rust). Run as part of CI; generate the aggregated license file on build.

For fonts, icons, illustrations, stock photos — same discipline. Check the license. Attribute as required.

## XI.4 Privacy Policy & Terms (Concrete Guidance)

A usable privacy policy states, for each category of data:
1. What is collected.
2. Why (the purpose).
3. How long it's retained.
4. Who it's shared with.
5. Where it's processed (jurisdiction).
6. What the user's rights are (access, rectify, delete, port, object).
7. How to exercise those rights (specific contact method).

**Do not copy a template verbatim.** Every section must match what your app actually does. A privacy policy that describes data collection you don't do — or fails to describe data collection you do do — is a liability.

Terms typically cover:
1. Eligibility (age, jurisdiction).
2. Account obligations (accuracy, security of credentials).
3. Prohibited uses.
4. Intellectual property (yours, theirs, licenses granted).
5. Service availability (no uptime guarantee unless you're offering a contractual SLA).
6. Limitation of liability.
7. Indemnification.
8. Dispute resolution (arbitration? courts? which jurisdiction?).
9. Changes to terms (how users are notified).
10. Termination.

For consumer apps in the EU, aggressive liability limitations may be unenforceable. Be realistic about what you can claim.

## XI.5 Accessibility Statement

A public-facing document describing:
1. Conformance level claimed (e.g., "This app aims to conform to WCAG 2.1 AA").
2. Known limitations and workarounds.
3. Contact for accessibility issues.
4. Date of last review.

For public-sector or regulated apps, this is often required. For private apps, it's good practice and reassuring to users.

## XI.6 SEO & Social Previews

For anything public:

**On-page SEO basics:**
- Unique, descriptive `<title>` per route.
- `<meta name="description">` per route — 120–155 characters.
- Semantic HTML (h1 used once, proper hierarchy).
- Canonical URLs to avoid duplicate content.
- Structured data (Schema.org JSON-LD) where applicable (articles, products, recipes).
- XML sitemap.
- `robots.txt`.
- Fast page loads (Core Web Vitals are a ranking factor).

**Social preview:**
- `og:title`, `og:description`, `og:image`, `og:url`, `og:type` — for Facebook/LinkedIn-style previews.
- `twitter:card` — for Twitter/X previews.
- OG images are 1200×630 ideally.
- Test with Facebook Debugger, Twitter Card Validator, LinkedIn Post Inspector.

**PWA manifest** (if PWA):
- `manifest.json` with name, short_name, icons (multiple sizes including 512×512 and 192×192, both regular and maskable), theme_color, background_color, display, start_url, orientation.
- Service worker with a real caching strategy (not just "cache everything" — that creates stale-content disasters).
- `apple-touch-icon` and other legacy icon conventions.
- Verify installability via Lighthouse PWA audit.

## XI.7 Content Review

The final read-through. Every piece of user-facing text in the app:
- Is it in the voice established in Stage 5?
- Is it correctly spelled and punctuated?
- Is it consistent across similar contexts ("Email" vs "E-mail" vs "email")?
- Is it free of TODO, placeholder, and lorem-ipsum?
- Is it localized correctly (dates, numbers, currencies)?
- Is it free of test data? (No "test@test.com" in production seed data.)
- Is the tone appropriate for error messages (not dismissive, not alarming, not preachy)?

For an app with substantial content (blog, docs, marketing pages), this review can be hours of work. Budget it.

## XI.8 Gate 10: Ship Readiness

- [ ] Release candidate tagged.
- [ ] Full test suite passes, including slow suites.
- [ ] Production build runs clean.
- [ ] Staging deploy is successful and a full-day observation period has elapsed.
- [ ] Privacy policy, terms, cookie notice, accessibility statement, contact info published.
- [ ] All required licenses are attributed.
- [ ] Sector-specific legal obligations met or escalated.
- [ ] SEO basics in place; social previews verified.
- [ ] PWA manifest verified (if PWA).
- [ ] All content reviewed for voice, correctness, localization.
- [ ] No test / placeholder data in production paths.
- [ ] Rollback plan is verified (actually tested in staging, not just written down).
- [ ] Incident response runbook exists and is reachable.
- [ ] The user has given explicit signoff on Tier-3 items (domain, payment processor, etc.).

This is the last gate before the user is involved. Everything autonomous ends here. Stages 11 and 12 require the user for at least the signoff moment.

---

# Part XII — Stage 11: Deployment & Release Engineering

> **Goal of this stage.** Get the code from git to the user, reliably, repeatably, reversibly. The first deploy is the easiest; the fiftieth deploy is where discipline pays off.

## XII.1 Environment Strategy

Three environments, at minimum:

1. **Development.** Each developer's local setup. Disposable. Can be reset at any time.
2. **Staging / preview.** A shared environment that mirrors production as closely as possible. Used for pre-release verification, integration tests against real external services (in test/sandbox mode), and user acceptance review. Uses staging credentials for paid services (Stripe test mode, Postmark sandbox, etc.).
3. **Production.** The real thing. Real user data. Real money if applicable. No one logs in and runs experiments here.

**Parity.** Staging and production use the same platform, same framework versions, same core config — just different data, different secrets, different resource sizes. A bug that reproduces only in production is a parity gap; investigate and close.

**Preview environments.** Per-branch or per-PR environments that the platform creates automatically (Vercel, Netlify, Render preview deploys). These speed iteration and make review concrete. Cheap and recommended.

**Ephemeral vs persistent.** Preview environments are ephemeral (torn down when the PR merges). Staging is persistent. Production is persistent and sacred.

## XII.2 Deployment Topology

Document in `docs/80-topology.md`:

- **Hosting.** Where does the app run? (Vercel, Fly, Railway, AWS Lambda, self-managed VPS.)
- **Region(s).** Single region for v1 usually fine. Multi-region if the user base is geographically distributed and latency matters.
- **Database hosting.** Same region as the app for latency. Same provider ideally for reliability.
- **Static assets.** CDN with long-lived cache-busting URLs (hashed filenames). Never serve static assets from the origin in production.
- **DNS.** Root domain and subdomains. Who controls DNS? What's the TTL? How are records updated?
- **TLS.** Certificate source (platform-managed, Let's Encrypt, purchased). Auto-renewal configured.
- **Email (transactional).** Postmark, Resend, SES, Mailgun, etc. DKIM, SPF, DMARC records.
- **Background jobs / queues.** Where do these run? (Inside the app? Separate worker? Managed queue service?)
- **Cron / scheduled tasks.** Who triggers them? Platform cron, separate scheduler (Hatchet, Trigger.dev, Inngest)?

This document is the map. When something breaks at 3 AM, you look here.

## XII.3 Secret Management

**Never in source control. Never in CI logs. Never in client-side bundles.**

- **Production secrets** live in the platform's secret store (Vercel env vars, AWS Secrets Manager, Google Secret Manager, HashiCorp Vault, Doppler, 1Password Secrets Automation).
- **CI/CD secrets** are stored in the CI platform's secret manager (GitHub Actions secrets, GitLab CI variables).
- **Developer secrets** live in `.env.local` files that are git-ignored. Each developer has their own.
- **Rotation.** Any secret that's ever been exposed (even briefly, even privately) is rotated. A "likely exposed" secret is an exposed secret.

**Client-side secrets are not secrets.** Anything bundled into the frontend (API URLs, public keys like Stripe publishable keys) is visible to any user. Never put anything there you wouldn't paste in a public Slack.

**Principle of least privilege.** Each secret grants the minimum access needed. API keys scoped to specific resources, not master keys. Separate keys per environment (staging and production have different Stripe keys).

## XII.4 Database Migrations

Covered in VIII.4. In deployment, migrations need specific care.

**Deploy pipeline order:**
1. Run migrations on the database.
2. Then deploy the new app version.

This works when migrations are backwards-compatible (the old app works with the new schema). When they're not:

**Forwards-compatible migrations:**
- Add a new column (nullable or with default) → old app ignores it, new app uses it.
- Add a new index → old app and new app both work fine.
- Add a new table → ditto.

**Not forwards-compatible (requires multi-step):**
- Drop a column. Old app might write to it. Sequence: stop writing → deploy stop-writing → drop column.
- Rename a column. Old app uses the old name. Sequence: add new column → write to both → backfill → read from new → stop writing to old → drop old.
- Change a column's type in a way that loses data. Backfill required.

**Migration testing.** Every migration is tested: apply on a staging database with production-shaped data; verify the app still works; roll back; verify the rollback works. Automated where possible.

**Migration as code review.** Every migration PR gets a careful read. A bad migration deployed to production is among the worst failures — worse than a bad app deploy, because the app deploy can be rolled back.

## XII.5 Canary, Blue/Green, Feature Flags

For most v1 apps, a simple deploy-in-place (atomic swap) is fine. The platform handles it: new version is built, then traffic cuts over.

For higher-stakes apps:

**Blue/green deployment.** Two identical production environments; one is live (blue), the other is staging (green). Deploy to green. Cut traffic to green. If green is healthy, it becomes the new blue. If not, cut back to blue. Simpler than canarying; adds some cost.

**Canary deployment.** Route a small percentage of traffic to the new version first (1%, then 5%, then 25%, etc.). Monitor error rates and SLIs. Roll forward if healthy, roll back if not. More nuanced than blue/green; requires the platform to support traffic splitting.

**Feature flags** (LaunchDarkly, Unleash, Flagsmith, PostHog Feature Flags, or DIY with a database table).
- Deploy code for a feature, but keep it dark (flag off).
- Enable for internal users first, then 1% of users, then all.
- Disable instantly if issues arise — without redeploying.
- Great for decoupling deploy from release.
- Cost: flag cruft accumulates. Removal discipline required.

For v1, feature flags are often overkill. For v2 with real users, they're essential for any meaningful change.

## XII.6 Rollback Plan

Every deploy has a rollback plan that can be executed in minutes. Not days, not hours — minutes.

**Typical rollback options:**
- Platform-native: Vercel's "Revert deployment," similar on other managed platforms. One click.
- Git-based: `git revert` the merge; re-deploy; CI promotes to production.
- Database: if the deploy included a migration, the rollback includes the reverse migration.

**Data rollback.** If the new version wrote data in a new format (new column, new table), rolling back the app doesn't remove that data. Usually this is fine (old app ignores it). Sometimes it's not (old app sees partial writes and behaves badly). Plan for this case.

**Rollback practice.** In staging, rehearse a rollback before every major release. The rollback procedure that's never been run is the rollback procedure that fails.

## XII.7 DNS, TLS, CDN

**DNS.**
- Use a registrar with 2FA and no single point of failure (Cloudflare Registrar, Namecheap, Gandi).
- TTLs: low (60–300s) during migrations, higher (3600+) in steady state.
- Redundant resolver (at least two NS records; most registrars handle this).
- MX records for email, SPF/DKIM/DMARC for email authentication.
- CAA records restricting which CAs can issue certificates for your domain.

**TLS.**
- Let's Encrypt or platform-managed certificates for most apps. Free, auto-renewed.
- TLS 1.2 minimum; TLS 1.3 preferred.
- Modern cipher suites; no RC4, no SSLv3.
- HSTS header with `max-age` of at least 6 months; `includeSubDomains` and `preload` once confident.
- Test with Qualys SSL Labs; aim for A+.

**CDN.**
- Static assets behind a CDN always.
- Cache-Control headers set appropriately (long for fingerprinted assets, short or no-cache for HTML).
- Origin shielding to reduce origin load.
- Purge capability tested.
- Consider Cloudflare, Fastly, or the platform's built-in CDN.

## XII.8 Gate 11: Green Deploy

- [ ] Production deploy succeeds.
- [ ] Smoke test in production passes (automated script that hits key endpoints and verifies).
- [ ] DNS resolves correctly.
- [ ] TLS certificate is valid and auto-renewing.
- [ ] Health check endpoint returns healthy.
- [ ] Real user can complete the primary user journey.
- [ ] Error tracking is receiving events (send a test error).
- [ ] Analytics is receiving events (do a test signup).
- [ ] Logs are flowing to the aggregator.
- [ ] Metrics dashboards show data.
- [ ] Alerts are armed.

**And then:** announce to no one yet. The actual "launch" in the marketing sense can be hours or days after this gate. Gate 11 is the technical deploy; marketing, announcements, social posts, press come later.

---

# Part XIII — Stage 12: Post-Ship Operations

> **Goal of this stage.** Transition from build mode to operate mode. The app is now live. The work changes in character: more monitoring, less building; more response, less planning.

## XIII.1 The First 48 Hours

The highest-risk window. Be present (or have alerts configured to a channel that's actually monitored).

**What to watch:**
- Error rate. A spike in the first hour often reveals production-only bugs (env-specific, data-shape-specific).
- Latency. Real users hit the database differently than load tests. Watch p95 and p99.
- Signup-to-activation funnel. Are new users completing the primary action?
- User feedback. Whatever channel you provide (email, a form, a Slack community), monitor it.
- External service quota. Are you hitting Stripe rate limits? Email sending limits? Analytics event caps?

**What to resist:**
- Making un-vetted changes. A "quick fix" at 2 AM without a review is how a small bug becomes a big outage.
- Turning off alerts. If they're noisy, tune them; don't disable them.
- Adding features. The first 48 hours are for stabilization, not growth.

**What to document:**
- Every issue observed, even if minor. `docs/issues-log.md` with timestamp, description, impact, resolution.
- Every surprise (expected vs actual). These inform v2 planning.

## XIII.2 Alerting & On-Call

Alerts must meet two criteria to be useful:
1. **They fire when something is wrong.** Missed alerts = hidden problems.
2. **They don't fire when nothing is wrong.** Noisy alerts = alert fatigue = missed real alerts.

**Alert severity tiers:**
- **Page** (immediate action required): service down, data loss risk, security breach indicator.
- **Attention** (act within hours): elevated error rate, exhausted budget, stuck job queue.
- **FYI** (review during business hours): deployment completed, certificate renewal upcoming.

**Alert destinations:**
- Pages: PagerDuty, Opsgenie, incident.io — something that wakes you up.
- Attention: Slack, Discord, email.
- FYI: email digest, dashboard.

**On-call** even for a solo developer is real. "Someone is responsible for responding" — that someone is you. Accept it; structure for it; don't let alerts go unseen.

**Runbook for each alert.** When an alert fires, the responder should not need to think. `docs/runbooks/alert-{name}.md` per alert, with:
- What the alert means.
- What to check first.
- How to mitigate.
- Who to escalate to.
- Post-incident tasks.

## XIII.3 Incident Response

An incident is anything that prevents users from getting the expected value from the app: outage, severe bug, security event, data loss.

**Roles** (even if one person wears all hats):
- Incident Commander: coordinates the response, makes decisions, delegates.
- Operations Lead: performs the fixes.
- Communications Lead: updates stakeholders (status page, users, team).
- Scribe: records the timeline.

**Response steps:**
1. **Detect.** Alert fires or report arrives.
2. **Acknowledge.** Someone is on it.
3. **Assess.** What's the scope? Who is affected? What's the expected duration?
4. **Communicate.** Status page update. User notification if appropriate.
5. **Mitigate.** Often this is rollback or circuit-breaker — not a proper fix. The proper fix comes after.
6. **Resolve.** Service restored.
7. **Postmortem.** Blameless analysis.

**Status page.** Even a simple one (a static page with "operational / degraded / down" for each major feature). Shows users you're aware and responding. Reduces inbound support. Tools: StatusPage (Atlassian), Instatus, Statuspal, or a self-hosted option.

**Postmortem.** Within a week of any significant incident. `docs/postmortems/YYYY-MM-DD-short-title.md`. Template:
1. Summary (non-technical).
2. Timeline (detection → resolution, in timestamps).
3. Impact (users affected, duration, data loss if any).
4. Root cause (technical + process contributing factors).
5. What went well (don't skip — reinforces good practices).
6. What went badly.
7. Action items (with owners and deadlines).

Blameless: focus on systems and processes, not individuals. "Claude deployed a broken migration" becomes "the deploy pipeline doesn't catch migrations that break on production-shaped data."

## XIII.4 Iteration Cadence

Post-ship, shift from "build everything" to "prioritize iterations."

**The loop:**
1. Review metrics (daily for the first weeks, weekly after).
2. Review user feedback (continuously).
3. Review Decision Registry for assumptions worth revisiting.
4. Pick the next highest-RICE item from `FUTURE.md` or from new learnings.
5. Plan, build, ship, repeat.

**Frequency.** Small changes daily or weekly. Larger features every 2–4 weeks. Big refactors quarterly at most, and only with a clear trigger.

**Versioning.** Use semantic versioning for shipped public APIs (if you have them). For apps, a simple MAJOR.MINOR pattern often suffices, with changelog entries per release.

**Deprecation.** When you remove or change a capability:
- Announce in advance (in-app notice, email, changelog).
- Provide migration path.
- Support both old and new for a grace period.
- Then remove.

## XIII.5 Deprecation & Sunset

Every feature has a lifecycle. Most apps accumulate cruft because they never deprecate.

**Signals a feature should be considered for deprecation:**
- Low usage (<1% of active users).
- Replaced by a better feature.
- Disproportionate support cost.
- Technical debt anchor (blocks refactoring elsewhere).

**Deprecation process:**
1. Mark as deprecated in docs and UI (banner: "This feature will be removed on YYYY-MM-DD").
2. Stop adding new capabilities to it.
3. Monitor usage; contact users who still depend on it.
4. At sunset date, remove.

For an entire app sunset (the project is being wound down):
- Announce months in advance.
- Provide data export for every user.
- Honor all open obligations (refunds, ongoing subscriptions).
- Preserve the codebase (even if private) for historical reference.
- Redirect the domain to a final page explaining the sunset.

## XIII.6 Gate 12: Operational Steady State

Met when, after 30 days in production:

- [ ] Uptime meets SLO.
- [ ] Latency meets SLO.
- [ ] Error rate meets SLO.
- [ ] No Sev-1 incidents outstanding.
- [ ] Every alert that fired has a runbook.
- [ ] Every incident had a postmortem.
- [ ] User feedback channel is active and responsive.
- [ ] Next iteration's priorities are written down.

This is the gate that says "the app is not just built, it's operable." From here, it's a product, not a project.

---

# Part XIV — Autonomous Decision Registry

> **Goal of this section.** Codify the rules by which Claude decides without asking. This is the heart of the autonomy contract — without it, "no intervention" degenerates into either (a) Claude asking everything anyway, or (b) Claude deciding everything recklessly.

## XIV.1 The Registry Format

`DECISIONS.md` at the repo root. See I.4 for the per-entry format. This section describes *when* to register and *how* to decide.

## XIV.2 Reversibility Tiers (Concrete)

**Tier 0 — Decide and forget.**
- Local variable naming.
- Internal helper function shape.
- Comment wording.
- File headers.
- Whitespace, ordering of imports, private module organization.
- Commit message phrasing.
- Bikeshed-tier aesthetic decisions (which shade of blue for a non-brand accent).

Don't register. Don't log. Just decide.

**Tier 1 — Decide and log.**
- Which small utility library to use for a specific feature (date-fns vs dayjs vs luxon).
- Which testing assertion style within the chosen framework.
- Which error message wording for a specific error.
- Which specific pattern to use for a single component's internal organization.
- Which CSS utility class to use vs writing a new token.
- Which icon to use for a specific button.

Register in `DECISIONS.md` as Tier 1. One line each is often enough. Don't spend 20 minutes justifying a Tier 1 decision.

**Tier 2 — Decide, log, and flag.**
- Primary framework choice.
- ORM / data layer technology.
- Rendering model (SSR/SSG/CSR/hybrid).
- Primary state management library.
- Authentication strategy and provider.
- Deployment target.
- Database technology and hosting.
- File storage technology.
- Styling strategy (Tailwind vs CSS Modules vs CSS-in-JS).
- Testing framework primary choice.
- CI/CD platform.
- Error tracking provider.
- Analytics provider.
- Primary UI component library (or choice to build from scratch).
- Font loading strategy.
- i18n strategy.
- PWA vs native vs hybrid.
- Commit / branch / release strategy.

For each: write an ADR (`docs/adr/`). Surface the decision in the Assumption Ledger if any aspect of it is based on an unverified assumption about the user's preferences or constraints.

**Tier 3 — Stop and ask.**
- Domain name selection (especially if registration is required).
- Company or product name selection (brand).
- Legal entity decisions.
- Choice of payment processor (merchant account obligations).
- Choice of managed services that require an account in the user's name.
- Any integration that requires giving a service access to the user's real email/phone/identity.
- Deletion or irreversible modification of user data.
- Force-push to protected branches.
- Production database schema changes that lose data.
- Enabling paid tiers of services.
- Public launches (announcement, press, social).
- Domain and DNS changes in production.
- Changing user-visible terms, privacy, or prices.

For each: do not proceed. Summarize the decision, the recommendation, and the reversibility cost. Ask explicitly.

## XIV.3 Default Choices by Decision Type

When autonomy is genuine (no user signal, Tier 1 or 2 decision), reach for these defaults unless context argues otherwise. They are not universal — they are starting points.

**Framework defaults (2026):**
- Web full-stack: Next.js 15+ App Router with React 19+.
- Web content-heavy: Astro.
- Mobile native iOS: SwiftUI.
- Mobile native Android: Kotlin + Jetpack Compose.
- Mobile cross-platform: React Native with Expo, or Flutter (if the team has Flutter experience).
- Desktop: Tauri (for web-stack familiarity) or Electron (for ecosystem maturity) or native (Swift / C# / Qt).
- CLI: Go (for ease of distribution) or Rust (for performance) or TypeScript + Bun (for web-team familiarity).
- Browser extension: plain TypeScript + Manifest V3.

**Data-layer defaults:**
- Relational default: Postgres (managed — Neon, Supabase, Railway).
- Document default: Postgres with JSONB columns (you rarely actually need MongoDB).
- Key-value cache: Upstash Redis (serverless-friendly) or platform-provided.
- Search (if needed): Meilisearch or Typesense, self-hosted or managed.
- Vector / embeddings: pgvector if already on Postgres; otherwise Qdrant or Pinecone.
- Object storage: Cloudflare R2 (cheap egress), AWS S3 (ecosystem), Backblaze B2 (cheapest).

**ORM / query-layer defaults:**
- TypeScript + Postgres: Drizzle (lighter, more SQL-like) or Prisma (more ergonomic, heavier).
- Python + Postgres: SQLAlchemy 2.x (mature) or Piccolo (async-first, simpler).
- Rust: sqlx (compile-time checked) or diesel.
- Avoid: hand-rolled query builders, except for tiny apps.

**Auth defaults:**
- Managed: Clerk (great DX, priced per MAU), Auth.js / NextAuth (self-managed, free), Supabase Auth (if already using Supabase), Firebase Auth (Google ecosystem).
- Self-rolled: only with strong reason (offline-first, compliance, custom federation).

**Styling defaults:**
- Tailwind CSS v4+ for most React apps with a clear design-token integration.
- CSS Modules for teams that prefer explicit CSS.
- vanilla-extract for type-safe CSS.
- Platform-native styling for native apps.

**Component library defaults:**
- Headless behavior + design-system styling: Radix UI primitives + your own tokens.
- Batteries-included: shadcn/ui (not a library, a copy-paste kit) — great for apps with specific design needs.
- Ant Design, Chakra UI, Mantine for apps where defaults are fine.

**State management defaults:**
- Server state: TanStack Query (React), Pinia (Vue), SWR (if Next.js).
- Client state small: built-in hooks / signals / state primitives.
- Client state medium: Zustand (React), Pinia (Vue).
- Client state large + multiplayer: Jotai, Valtio, Redux Toolkit.

**Testing defaults:**
- Unit + integration (JS): Vitest.
- Component testing: Vitest + Testing Library.
- E2E: Playwright.
- Python: pytest.
- Rust: built-in test framework + insta for snapshot testing.

**Deployment defaults:**
- Web full-stack: Vercel (for Next.js) or Railway / Fly.io / Render.
- Static: Cloudflare Pages, Vercel, Netlify.
- Backend-heavy: Fly.io, Railway, Render.
- Enterprise / heavy: AWS (ECS / Lambda), GCP, Azure.
- Database: Neon (Postgres), PlanetScale (MySQL), Supabase, Turso (SQLite at the edge).

**Analytics defaults:**
- Privacy-respecting: Plausible, Fathom.
- Feature-rich: PostHog (self-hostable).
- Product-decision-focused: PostHog or Amplitude.

**Error tracking defaults:**
- Sentry (industry default, generous free tier).
- GlitchTip (FOSS Sentry-compatible).

These defaults are **starting points**, not mandates. Context overrides defaults. A user who has said "I work in Rust and want my side projects in Rust" gets a Rust stack, period.

## XIV.4 When to Escalate

Claude escalates (Tier 3, stop and ask) when:

1. **A decision is irreversible** — can't undo without heroic effort.
2. **A decision is legally consequential** — contracts, compliance, liability.
3. **A decision costs money** on the user's behalf.
4. **A decision involves the user's real-world identity** (domain, company name, brand, public announcements).
5. **Multiple high-falsification-cost assumptions** have stacked such that proceeding would be speculation rather than decision-making.
6. **The scope of the request has materially shifted** — what Claude understood in Stage 1 is no longer what the user seems to want.
7. **An ethical, safety, or regulatory concern** applies that the user needs to be aware of.
8. **A Tier-2 decision has no clear default** — two or more options are equally defensible and the choice will significantly shape the product.

The escalation format (from I.7):
```
**Context:** [one sentence about where we are]
**Question:** [the specific decision]
**Options:**
  - A: [option] — [tradeoffs]
  - B: [option] — [tradeoffs]
**Recommendation:** [Claude's default if user says "just pick"]
**Reversibility:** Tier 2 / Tier 3
```

After the user responds, resume autonomy.

---

# Appendix A — Stack Decision Trees

These trees turn vague requirements into a concrete stack. Run top-down. Stop at the first branch that fits; don't over-optimize.

## A.1 Frontend Framework Decision Tree

```
START: What kind of UI surface?
│
├─ Static content (marketing, docs, blog, landing page)
│   ├─ Needs MDX / content collections? → Astro
│   ├─ Needs React ecosystem? → Next.js (static export) or Astro + React islands
│   ├─ Pure HTML/CSS is enough? → 11ty, Hugo, or hand-rolled HTML
│   └─ Needs full CMS? → Astro + Sanity/Contentful/Payload
│
├─ Marketing site + light interactivity (forms, modals, auth)
│   ├─ SEO critical → Next.js (App Router) or Astro + Islands
│   ├─ SEO not critical → Vite + React / Vue SPA
│   └─ Want minimum JS → Astro + Svelte/Preact islands
│
├─ Web app (dashboard, SaaS, internal tool)
│   ├─ Server components / SSR needed → Next.js, Remix, SvelteKit, Nuxt
│   ├─ Pure SPA acceptable → Vite + React / Vue / Svelte / Solid
│   ├─ Heavy data grid / enterprise → React + AG Grid / TanStack Table
│   └─ Real-time collaborative → Next.js + Liveblocks / Yjs, or Remix + Pusher
│
├─ Mobile app (iOS + Android)
│   ├─ Web skills only + OK with some platform gaps → Expo + React Native
│   ├─ Need max native feel + shared codebase → Flutter
│   ├─ Want one codebase with web reach too → Expo (RN Web) or Ionic
│   ├─ Native iOS only → SwiftUI
│   ├─ Native Android only → Jetpack Compose (Kotlin)
│   └─ Game → Unity / Godot / Unreal
│
├─ Desktop app
│   ├─ Web skills, small bundle OK → Electron + React/Vue
│   ├─ Web skills, small bundle critical → Tauri + React/Vue/Svelte
│   ├─ Native macOS only → SwiftUI / AppKit
│   ├─ Native Windows → WinUI 3 / WPF / .NET MAUI
│   └─ Cross-platform native-feeling → Flutter
│
├─ Browser extension
│   ├─ Cross-browser (Chrome/Firefox/Safari/Edge) → Plasmo or WXT
│   ├─ Chrome only → vanilla Manifest V3 + React
│   └─ Firefox-focused → WebExtension API + Svelte/Vue
│
├─ CLI tool
│   ├─ Node ecosystem → Commander / oclif / Ink (if TUI)
│   ├─ Python ecosystem → Click / Typer / Textual (if TUI)
│   ├─ Cross-platform, single binary → Go (cobra) or Rust (clap)
│   └─ TUI-heavy → Ratatui (Rust), Bubble Tea (Go), Textual (Python)
│
└─ Embedded UI (kiosk, IoT, signage)
    ├─ Web-stack acceptable → React/Vue in Chromium kiosk mode
    ├─ Constrained hardware → Qt / QML, or LVGL (embedded C/C++)
    └─ Industrial → Flutter embedded or Qt
```

**Tiebreakers (apply in order):**
1. Does the user's memory / past work reveal a stack preference? Use that.
2. Does the team (if any) already know one option? Use that.
3. Is there a dominant ecosystem for this domain? (E-commerce → Next.js; data apps → Next.js or Remix; content → Astro). Use that.
4. Default to React + Next.js or React + Vite for web; React Native (Expo) for mobile; Tauri for desktop.

## A.2 Backend / API Decision Tree

```
START: What shape is the backend?
│
├─ No backend — frontend-only app with third-party APIs (Firebase, Supabase, Clerk)
│   └─ Choose BaaS: Supabase (Postgres), Firebase (NoSQL realtime), AppWrite (open-source), Convex (TypeScript-native).
│
├─ Tiny backend — just auth, a few endpoints, webhook receiver
│   ├─ Colocate with frontend → Next.js API routes / Remix actions / SvelteKit endpoints
│   ├─ Want separate service → Hono, Elysia, Fastify (JS/TS); FastAPI (Python); Axum (Rust)
│   └─ Serverless functions → Vercel Functions, Cloudflare Workers, AWS Lambda
│
├─ Standard CRUD API (most SaaS apps)
│   ├─ TypeScript preferred → NestJS (opinionated), Fastify (minimal), Hono (edge-ready)
│   ├─ Python preferred → FastAPI (async, typed) or Django (batteries-included)
│   ├─ Ruby preferred → Rails
│   ├─ Go preferred → Chi, Echo, Gin, or stdlib net/http + sqlc
│   ├─ Rust preferred → Axum, Actix-Web
│   ├─ Java/Kotlin → Spring Boot, Ktor
│   ├─ C# → ASP.NET Core Minimal APIs
│   └─ Elixir → Phoenix
│
├─ Real-time heavy (chat, presence, collaborative editing)
│   ├─ WebSockets + low latency → Elixir Phoenix Channels, Go + Gorilla/WebSocket, Node + ws
│   ├─ CRDTs for collaboration → Yjs + y-websocket, or Automerge
│   ├─ Managed service → Ably, Pusher, Liveblocks, PartyKit
│   └─ Long polling acceptable → SSE with any HTTP framework
│
├─ Data-heavy / pipelines / ETL
│   ├─ Python ecosystem (ML, data science) → FastAPI + Celery / Prefect / Airflow
│   ├─ Streaming → Kafka + Flink/Spark, or Redpanda + simpler consumers
│   └─ Batch scheduled jobs → Cron + script, or Temporal for durability
│
├─ ML / AI inference
│   ├─ Wrapping commercial APIs (OpenAI, Anthropic, etc.) → any backend, just be careful with streaming and retries
│   ├─ Self-hosted LLM → vLLM, Ollama, TGI, or llama.cpp
│   ├─ Traditional ML inference → FastAPI + scikit-learn/ONNX, or dedicated (BentoML, Ray Serve)
│   └─ Vector search → pgvector (Postgres), Qdrant, Pinecone (managed), Weaviate
│
└─ Microservices (only if you genuinely need them — don't default here)
    ├─ Service mesh → Istio / Linkerd on Kubernetes
    ├─ Event-driven → Kafka / NATS / RabbitMQ + service-per-domain
    └─ Orchestration → Temporal for long-running workflows
```

**Default for unknown-shape SaaS:** FastAPI (Python, if AI-adjacent) or Fastify/Hono (TypeScript, if frontend is JS-heavy) on Postgres on a managed host (Fly.io, Railway, Render).

## A.3 Data Store Decision Tree

```
START: What does the data look like?
│
├─ Transactional, relational, "normal app data"
│   ├─ Managed Postgres → Neon (serverless), Supabase, Railway, Fly Postgres
│   ├─ Self-hosted Postgres → Docker + managed backups
│   └─ SQLite → Turso (edge), libSQL, or local file (tiny apps, CLIs, desktop)
│
├─ Document / flexible schema
│   ├─ Don't want joins → MongoDB Atlas, Firestore
│   ├─ Schema changes frequently → Postgres + JSONB columns (usually better than Mongo)
│   └─ Offline-first mobile/desktop → RxDB, WatermelonDB, PouchDB
│
├─ Key-value / caching / sessions
│   ├─ Redis (Upstash serverless, Redis Cloud, self-hosted) → defaults
│   ├─ Edge → Cloudflare KV, Workers Durable Objects
│   └─ In-memory only → Memcached (rarely needed nowadays)
│
├─ Time-series / metrics
│   ├─ Prometheus (self-hosted, pull-based)
│   ├─ InfluxDB / TimescaleDB (Postgres extension)
│   └─ Managed → Grafana Cloud, Datadog
│
├─ Search
│   ├─ Full-text in Postgres → built-in tsvector, or pgroonga; good for small/medium
│   ├─ Dedicated → Meilisearch (simple), Typesense (self-hosted), Algolia (managed)
│   └─ Advanced analytics + search → Elasticsearch / OpenSearch
│
├─ Graph
│   ├─ Small-scale, within Postgres → Apache AGE or recursive CTEs
│   ├─ Dedicated → Neo4j, Dgraph
│   └─ Knowledge-graph-heavy AI app → consider embeddings + pgvector first
│
├─ Analytics / columnar / OLAP
│   ├─ DuckDB (embedded, local, incredibly fast for analytics)
│   ├─ ClickHouse (scale-out)
│   └─ BigQuery / Snowflake / Redshift (managed)
│
├─ Object storage (images, videos, binaries)
│   ├─ S3 (AWS), Cloudflare R2 (no egress fees), Backblaze B2 (cheap)
│   ├─ Local dev → MinIO
│   └─ CDN layer → Cloudflare, Fastly, Bunny
│
└─ Vector (embeddings, semantic search)
    ├─ pgvector (Postgres extension) — default, colocated with relational data
    ├─ Qdrant (dedicated, open-source)
    ├─ Pinecone (managed, popular)
    └─ Weaviate, Milvus (advanced cases)
```

**Default for unknown-shape app:** Managed Postgres (Neon or Supabase) + object storage (R2 or S3) + Redis if caching/sessions needed. Add pgvector if embeddings involved. Don't introduce a second database until the first is genuinely insufficient.

## A.4 Auth Decision Tree

```
START: Who are the users?
│
├─ Just me / internal team
│   ├─ Magic link → any SMTP service + small lib
│   ├─ Simple password → bcrypt/argon2 + session cookies
│   └─ SSO with Google Workspace → Google OAuth
│
├─ Consumer app with password + OAuth
│   ├─ Managed → Clerk (best DX), Auth0 (mature), Supabase Auth (if using Supabase)
│   ├─ Open-source hosted → Authentik, Keycloak
│   ├─ Roll-your-own (small apps) → Lucia Auth + your DB
│   └─ Frontend-only auth layer → Firebase Auth
│
├─ Enterprise B2B (SSO, SAML, SCIM)
│   ├─ Managed → WorkOS (purpose-built), Clerk B2B, Auth0 Enterprise
│   └─ Roll-your-own → don't. SAML is painful. Use WorkOS.
│
├─ Passwordless / WebAuthn / Passkeys
│   ├─ Clerk, Auth0, and Supabase all support passkeys
│   └─ Custom → use SimpleWebAuthn library + your DB
│
└─ Federated / Web3 / wallet auth
    ├─ RainbowKit / ConnectKit (Ethereum wallets)
    └─ Dynamic, Privy (multi-chain)
```

**Default:** Clerk for most apps under 10k MAU (generous free tier, excellent DX). Supabase Auth if already using Supabase. WorkOS the moment enterprise customers appear.

## A.5 Hosting Decision Tree

```
START: What are you shipping?
│
├─ Static site (Astro, Next.js static export, Vite SPA)
│   ├─ Cloudflare Pages (free, fast, generous)
│   ├─ Vercel (best Next.js experience)
│   ├─ Netlify (Jamstack features)
│   └─ GitHub Pages (only for docs/simple sites)
│
├─ Next.js / Remix / SvelteKit (Node SSR)
│   ├─ Vercel (default for Next.js; best DX, ISR, edge functions)
│   ├─ Netlify (good alternative)
│   ├─ Railway / Fly.io / Render (self-managed Node, more control, cheaper at scale)
│   └─ Cloudflare Workers (if you can live within the limits — fast, cheap)
│
├─ Container-shaped backend (Node, Python, Go, Rust, Ruby)
│   ├─ Fly.io (excellent DX, global, Postgres colocated)
│   ├─ Railway (easy, beautiful, good free tier)
│   ├─ Render (reliable, Heroku-like)
│   ├─ Cloudflare Workers / Deno Deploy (if your code fits the serverless runtime model)
│   └─ AWS Fargate / GCP Cloud Run / Azure Container Apps (enterprise)
│
├─ Kubernetes
│   ├─ Don't. Unless the product genuinely needs it (you're scaling past millions of requests,
│   │  or you're a platform team with ops bandwidth).
│   ├─ If you must: managed clusters (EKS, GKE, AKS) + ArgoCD / Flux + Helm.
│   └─ Lightweight alternative → Nomad, or bare Docker + Traefik on a VPS.
│
├─ Serverless functions
│   ├─ AWS Lambda (mature, ecosystem-heavy, cold starts)
│   ├─ Cloudflare Workers (no cold starts, 10ms CPU limit on free)
│   ├─ Vercel Functions / Netlify Functions (integrated with deploys)
│   └─ Deno Deploy (TypeScript-native, global)
│
├─ Long-running background workers
│   ├─ Render / Railway / Fly.io workers
│   ├─ Temporal Cloud (for durable workflows)
│   └─ Your own queue (BullMQ, Celery, Sidekiq) + worker processes
│
└─ Self-hosted / on-prem
    ├─ Small VPS (Hetzner, DigitalOcean, Vultr) + Docker Compose + Caddy/Traefik
    ├─ CapRover / Coolify / Dokku (open-source PaaS on your own VPS)
    └─ Full Kubernetes cluster (only if justified)
```

**Default for a new SaaS:** Vercel for the frontend/Next.js, Fly.io or Railway for any separate backend, Neon or Supabase for Postgres, Cloudflare R2 for assets.

## A.6 CSS / Styling Decision Tree

```
START: What's the UI style?
│
├─ Highly custom / brand-heavy design
│   ├─ Tailwind CSS (utility-first, fastest iteration)
│   ├─ CSS Modules + custom design tokens (more traditional)
│   └─ Vanilla Extract (type-safe CSS-in-TS)
│
├─ Component library + customization
│   ├─ shadcn/ui (copy-paste Radix + Tailwind, most flexible)
│   ├─ Radix Primitives + your own styles
│   ├─ Ark UI (framework-agnostic Radix-like primitives)
│   └─ Park UI (shadcn-like, multiple frameworks)
│
├─ Ready-made design system
│   ├─ Material UI (Google Material Design)
│   ├─ Chakra UI (accessible, themeable)
│   ├─ Mantine (feature-rich, hooks)
│   ├─ Ant Design (enterprise / dashboards)
│   └─ Geist / Vercel UI (minimal, sharp)
│
├─ Mobile-like / native-feeling
│   ├─ NativeWind (Tailwind for React Native)
│   ├─ Tamagui (cross-platform RN + web)
│   └─ Gluestack
│
└─ Content-first / typographic
    ├─ Tailwind Typography plugin
    └─ Custom CSS with prose class or Pollen-like token system
```

**Default:** Tailwind + shadcn/ui for web; NativeWind or Tamagui for React Native; SwiftUI / Compose for native.

## A.7 CI/CD Decision Tree

```
START: Where is the code hosted?
│
├─ GitHub → GitHub Actions (default, ubiquitous, free for public/open-source, generous for private)
├─ GitLab → GitLab CI (built-in)
├─ Bitbucket → Bitbucket Pipelines
└─ Any → CircleCI, Buildkite (enterprise), Jenkins (legacy, self-hosted)
```

**Deployment automation:**
- Vercel / Netlify / Railway / Fly.io all offer auto-deploy from Git push. Use it.
- For Kubernetes: ArgoCD (GitOps, pull-based) or Flux.
- For containers: build in CI, push to registry (GHCR, Docker Hub), deploy by image digest.

## A.8 Language Choice (when truly undecided)

For web frontend: **TypeScript + React**. Unless the user has said otherwise.

For backend, default to TypeScript if the frontend is already TS (one language, shared types via a monorepo). If the domain is data/ML, default to Python. If the domain is systems/performance, default to Rust or Go.

Never pick a language for its novelty. Pick it because its ecosystem serves the product's needs and (if a user is involved) because they're comfortable in it.


# Appendix B — Template Library

Copy-paste templates for the artifacts Claude produces during autonomous work. Fill in the `[bracketed]` placeholders. Do not remove sections — if a section genuinely doesn't apply, write "N/A — [reason]".

## B.1 Product Requirements Document (PRD)

**File:** `docs/01-prd.md`

```markdown
# Product Requirements Document — [Product Name]

**Status:** Draft | In Review | Approved | Shipped
**Owner:** [Name]
**Last updated:** [YYYY-MM-DD]
**Related docs:** [links to ADRs, brief, designs]

## 1. Summary
One paragraph. What is this product, who is it for, what problem does it solve, why now.

## 2. Problem Statement
- **Who has the problem:** [user archetype]
- **What the problem is:** [concrete description]
- **How they solve it today:** [current workaround, competing tool, or nothing]
- **Why that's insufficient:** [pain points]
- **Evidence:** [quotes, data, observations — or honestly note "none yet, assumed"]

## 3. Goals & Non-Goals
### Goals
- G1: [outcome, not feature]
- G2: …

### Non-Goals
- NG1: [thing this product will NOT do, to sharpen scope]
- NG2: …

## 4. Target Users
- **Primary persona:** [name, role, context, jobs-to-be-done]
- **Secondary personas:** [if any]
- **Anti-personas:** [who this is NOT for]

## 5. User Stories
Format: *As a [persona], I want [capability] so that [outcome].*

- US-001: As a …
- US-002: As a …

## 6. Functional Requirements
### Must-Have (MVP)
- FR-M1: [requirement]
- FR-M2: …

### Should-Have (v1.0)
- FR-S1: …

### Could-Have (v1.x)
- FR-C1: …

### Won't-Have (explicitly)
- FR-W1: …

## 7. Non-Functional Requirements
- **Performance:** [p95 latency target, throughput, payload size]
- **Availability:** [uptime target, SLO]
- **Security:** [auth model, data classification, threat model summary]
- **Privacy:** [data collected, retention, user rights, regulations — GDPR/CCPA/HIPAA]
- **Accessibility:** [WCAG level, platforms]
- **Compatibility:** [browsers, OS, devices, screen sizes]
- **Internationalization:** [languages, locales, RTL, date/currency formats]
- **Scalability:** [expected users, growth, peak traffic]

## 8. Success Metrics
- **Activation:** [metric + target, e.g. "% of new users reaching first-value within 10 minutes"]
- **Engagement:** […]
- **Retention:** […]
- **Quality:** [error rate, crash-free sessions, support ticket volume]
- **Business:** [revenue, conversion, whatever applies]

## 9. Launch Criteria
Checklist items that must be true before ship:
- [ ] All Must-Have FRs implemented and tested
- [ ] All NFR targets met in staging
- [ ] Accessibility audit passed
- [ ] Security review complete
- [ ] Observability in place (logs, metrics, traces)
- [ ] Runbook written for on-call
- [ ] Legal: privacy policy + terms published

## 10. Open Questions
- Q1: [question] — *status: unresolved / answered in decision DR-###*

## 11. Appendix
- Competitive analysis: [link]
- Research notes: [link]
- Designs: [link]
```

## B.2 Architecture Decision Record (ADR)

**File:** `docs/adr/NNNN-short-title.md`

```markdown
# ADR NNNN — [Short Decision Title]

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
- **Date:** YYYY-MM-DD
- **Decider(s):** [Claude / user / team]
- **Tags:** [frontend, data, infra, security, …]

## Context
What is the problem, situation, or force driving this decision? What constraints apply? What was considered "already decided" before this ADR?

## Decision
The single sentence that captures the chosen direction, then a paragraph of detail.

## Options Considered
### Option A — [name]
- Pros: …
- Cons: …
- Reversibility: Tier 0 / 1 / 2 / 3

### Option B — [name]
- Pros: …
- Cons: …

### Option C — …

## Decision Drivers
Ordered list of the factors that mattered most. Example:
1. Must support offline-first mobile use.
2. Team is TypeScript-fluent; avoiding a second language.
3. Budget — cannot afford a separate vector DB.

## Consequences
### Positive
- …

### Negative / trade-offs accepted
- …

### Neutral but worth noting
- …

## Follow-ups
- [ ] [task] (owner: …, due: …)
- [ ] Revisit when [trigger condition]

## References
- [Link to relevant PR, doc, discussion]
```

## B.3 Decision Registry Entry

**File:** `docs/DECISIONS.md` (append-only log; latest at top)

```markdown
## DR-NNN — [Short title]
- **Date:** YYYY-MM-DD
- **Tier:** 1 | 2
- **Stage:** [discovery / architecture / implementation / release / …]
- **Context:** One-sentence situation.
- **Options:** A — …; B — …; C — …
- **Decision:** [Chosen option] because [concise rationale].
- **Reversal cost:** [low / medium / high; estimated work to reverse]
- **Revisit trigger:** [event or metric that would cause us to re-examine]
- **Related:** [ADR-NNNN, PR #, or "none"]
```

## B.4 Assumption Ledger Entry

**File:** `docs/ASSUMPTIONS.md`

```markdown
## A-NNN — [Short description of assumption]
- **Date:** YYYY-MM-DD
- **Stage:** [where this assumption was introduced]
- **Assumption:** [the belief, stated clearly]
- **Basis:** [why we believe this — user quote, inference, analogy, nothing]
- **Falsification cost:** [what rework if this turns out wrong — low/medium/high]
- **Invalidation check:** [how and when we'll find out — test, telemetry, user feedback, date]
- **Status:** Open | Confirmed | Invalidated | Obsolete
- **Confirmed/invalidated on:** YYYY-MM-DD — [how]
```

## B.5 User Story

```markdown
### US-NNN — [Short title]
**As a** [persona]
**I want** [capability]
**So that** [outcome]

**Acceptance criteria:**
- [ ] Given [precondition], when [action], then [observable outcome].
- [ ] Given …, when …, then ….
- [ ] Edge: …
- [ ] Error: …

**Out of scope:** [what this story deliberately doesn't cover]
**Depends on:** [US-NNN, if any]
**Estimate:** [S / M / L or point value]
**Definition of Done:** Unit tests pass, integration tests pass, a11y checked, copy reviewed, deployed to staging, manually verified.
```

## B.6 Runbook

**File:** `docs/runbooks/[incident-or-task-name].md`

```markdown
# Runbook — [Name]

**Purpose:** [When is this runbook used? What triggers it?]
**Audience:** [On-call engineer / support / deploy engineer / …]
**Last reviewed:** YYYY-MM-DD
**Drill last run:** YYYY-MM-DD

## Prerequisites
- Access required: [list systems, secrets, permissions]
- Tools required: [CLI, VPN, dashboards]
- Estimated duration: [minutes / hours]

## Indicators (when to invoke)
- Alert fires: [alert name, threshold]
- User report matching: [pattern]
- Metric deviation: [SLO breach, error-rate spike]

## Procedure
### Step 1 — Verify the problem
- Check [dashboard X]
- Check [log query Y]
- Expected: [what healthy looks like]
- If not reproduced → STOP, this runbook does not apply.

### Step 2 — Contain
- [action], e.g. "Toggle feature flag `xyz` off in LaunchDarkly"
- Verify impact: [what to observe]

### Step 3 — Diagnose
- [queries, commands, inspection points]

### Step 4 — Remediate
- [specific commands with example output]
- Do NOT [common footgun]

### Step 5 — Verify recovery
- [success criteria, e.g. "error rate < 0.1% for 10 minutes"]

### Step 6 — Communicate
- Update [status page / channel / stakeholder list]
- Template: [ready-to-send wording]

### Step 7 — Post-mortem trigger
- If outage > [threshold], schedule a post-mortem within 72 hours using Appendix B.7.

## Rollback
If the remediation makes things worse:
- [specific rollback commands]
- Escalate to: [contact]

## Known gotchas
- [things that have burned people in the past]

## Related
- Incident log: [link]
- Related runbooks: […]
```

## B.7 Incident Post-Mortem

**File:** `docs/postmortems/YYYY-MM-DD-short-title.md`

```markdown
# Post-Mortem — [Incident Title]

**Incident date:** YYYY-MM-DD
**Duration:** [start time] → [end time] ([total minutes])
**Severity:** SEV-1 / SEV-2 / SEV-3
**Status:** Draft | Final
**Author:** [name]
**Reviewed by:** [names]

## Summary
2–3 sentences. What happened, who was affected, how it was resolved.

## Impact
- **Users affected:** [count, percentage, segment]
- **Duration of impact:** [X minutes]
- **Services affected:** […]
- **Business impact:** [requests failed, revenue at risk, SLA breached]

## Timeline (UTC)
- HH:MM — [event: deploy, first alert, detection, action, resolution]
- HH:MM — …

## Root Cause
What actually caused this? Use the "five whys" if useful. Be specific. Avoid blame.

## Contributing Factors
- [factor 1: e.g., "missing alert on queue depth"]
- [factor 2: e.g., "deploy procedure skipped canary"]

## What Went Well
- [e.g., "rollback completed in 4 minutes"]

## What Went Poorly
- [e.g., "took 18 minutes to detect"]
- [e.g., "runbook was out of date"]

## Action Items
| ID | Action | Owner | Due | Status |
|----|--------|-------|-----|--------|
| AI-1 | [specific, measurable] | [name] | YYYY-MM-DD | Open |
| AI-2 | … | … | … | … |

## Lessons Learned
What general principles emerge from this incident that should inform future work?

## Blameless Note
This post-mortem follows a blameless culture. Our goal is to improve systems, not assign fault to individuals.
```

## B.8 Feature Flag Definition

```markdown
### FF-[name]
- **Purpose:** [what this flag controls]
- **Default (new environments):** off
- **Rollout plan:** 1% → 10% → 50% → 100% over [duration], pausing if [guardrails]
- **Guardrails:** [error rate < X, p95 latency < Y, conversion > Z]
- **Success criteria:** [what 100% means — all users on, no regressions for 7 days]
- **Kill criteria:** [what forces an emergency rollback]
- **Removal date:** [when this flag should be deleted from code] (YYYY-MM-DD)
- **Owner:** [name]
```

## B.9 Gate Checklist Template

```markdown
## Gate [N] — [Stage Name]

**Purpose:** Confirm stage N deliverables are complete before advancing.

- [ ] [specific falsifiable criterion 1]
- [ ] [criterion 2]
- [ ] …
- [ ] All open questions either answered or logged in DECISIONS / ASSUMPTIONS
- [ ] All Tier 2 decisions since last gate have ADRs
- [ ] All Tier 1 decisions since last gate are in DECISIONS.md
- [ ] No unacknowledged Tier 3 decisions

**Exit criteria:** Every box checked. If any box is false, either complete the item or explicitly document the deferral (with a revisit date).

**Advancement decision:**
- [ ] Advance to Stage [N+1]
- [ ] Loop back to Stage [M] because [reason]
- [ ] Escalate to user because [reason]
```

## B.10 Pull Request Description Template

```markdown
## What
[One-sentence summary of the change]

## Why
[The user/business reason, or the bug ID, or the ADR link]

## How
[Technical approach in 2–5 bullets]
- …

## Checklist
- [ ] Tests added/updated and passing locally
- [ ] Types check
- [ ] Lint passes
- [ ] Manually tested: [what flows]
- [ ] Screenshots attached (if UI change)
- [ ] Migrations are backwards-compatible (or explicitly not, with coordination plan)
- [ ] Feature flag added (if risky)
- [ ] Docs updated (README, CHANGELOG, runbook)
- [ ] No unresolved TODOs in the diff

## Risk
- Blast radius: [tiny / small / medium / large]
- Rollback plan: [revert PR / toggle flag / migration reversal]

## Related
- Closes #[issue]
- Relates to [ADR-NNNN, DR-NNN]
```

## B.11 CHANGELOG Entry

**File:** `CHANGELOG.md` (Keep-a-Changelog format)

```markdown
## [Unreleased]

### Added
- [feature] ([#PR])

### Changed
- [behavior change] ([#PR])

### Deprecated
- [API/feature scheduled for removal]

### Removed
- [removed feature] ([#PR])

### Fixed
- [bug fix] ([#PR])

### Security
- [security patch] ([#PR])

## [1.2.0] — YYYY-MM-DD
…
```

## B.12 Threat Model (Lightweight STRIDE)

**File:** `docs/security/threat-model.md`

```markdown
# Threat Model — [Component / Feature]

**Scope:** [what's in, what's out]
**Last reviewed:** YYYY-MM-DD

## Data Classification
- Public: [examples]
- Internal: […]
- Confidential: […]
- Regulated (PII / PHI / PCI): […]

## Trust Boundaries
- [Boundary 1: e.g., "Browser ↔ API gateway"]
- [Boundary 2]

## Threats (STRIDE)
| ID | Threat | Category | Likelihood | Impact | Mitigation | Status |
|----|--------|----------|------------|--------|------------|--------|
| T1 | [e.g. "CSRF on state-changing endpoints"] | Tampering | M | H | SameSite=Lax cookies + CSRF tokens | Mitigated |
| T2 | [e.g. "Credential stuffing at login"] | Spoofing | H | H | Rate limit + CAPTCHA + breached-password check | In progress |
| T3 | … | … | … | … | … | … |

## Accepted Risks
- [risk accepted, with reason and revisit date]
```

## B.13 Cookie / Data Collection Disclosure

```markdown
# Data & Cookie Disclosure

## Cookies we set
| Name | Purpose | Duration | Category |
|------|---------|----------|----------|
| session | Keeps you logged in | 30 days | Strictly necessary |
| csrf_token | Security | Session | Strictly necessary |
| consent_prefs | Remembers your consent choices | 1 year | Strictly necessary |
| _analytics_anon | Aggregate usage (no PII) | 1 year | Analytics (opt-in in EU/UK) |

## Data we collect
| Field | Why | Retention | Who sees it |
|-------|-----|-----------|-------------|
| Email | Account login, notifications | Until account deletion | Support, you |
| Usage events | Improve the product | 24 months | Engineering, aggregated |
| Payment info | Billing | Per payment processor; we don't store card numbers | Stripe |

## Your rights (if GDPR applies)
- Access / export
- Correction
- Deletion
- Portability
- Objection / restriction
- Contact: [email]
```

## B.14 README

**File:** `README.md`

```markdown
# [Project Name]

[One-sentence pitch.]

![status](badge) ![license](badge) ![ci](badge)

## What it is
[A paragraph.]

## Quick start
```bash
git clone [repo]
cd [project]
[setup command]
[run command]
```

Open [http://localhost:PORT].

## Requirements
- [Node 20+ / Python 3.11+ / etc]
- [Other tools]

## Environment
Copy `.env.example` to `.env` and fill in the required values. See `docs/env.md` for descriptions.

## Project layout
```
src/
  …
docs/
  01-prd.md
  adr/
  …
tests/
```

## Scripts
| Command | What it does |
|---------|--------------|
| `npm run dev` | Start dev server |
| `npm run test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Lint + type-check |

## Contributing
See `CONTRIBUTING.md`.

## License
[SPDX identifier]. See `LICENSE`.

## Security
See `SECURITY.md` for how to report vulnerabilities.
```


# Appendix C — Pre-Flight Checklists

Consolidated gate checklists. Copy into `docs/gates/gate-NN.md` as each stage closes.

## C.1 Gate 1 — Discovery Complete
- [ ] Product one-liner written in ≤30 words.
- [ ] Primary persona defined with role, context, jobs-to-be-done.
- [ ] Problem statement names who, what, current workaround, insufficiency.
- [ ] Evidence (real or marked as assumed) captured.
- [ ] 3–5 headline success metrics identified.
- [ ] Explicit non-goals listed (≥3 items).
- [ ] Self-interview (30 questions) completed; answers in `docs/discovery/self-interview.md`.
- [ ] Any user-specific context (from memory, brief, samples) preserved.
- [ ] No Tier-3 ambiguities remaining unresolved (or escalated).
- [ ] `docs/00-brief.md` and `docs/01-prd.md` drafted.

## C.2 Gate 2 — Product Definition Complete
- [ ] PRD sections 1–11 filled in (Appendix B.1).
- [ ] User stories written for all Must-Have requirements.
- [ ] Acceptance criteria testable and specific (Given/When/Then).
- [ ] MoSCoW + RICE scoring applied; MVP scope fits projected timeline.
- [ ] Non-functional requirements quantified (numbers, not adjectives).
- [ ] Launch criteria defined and falsifiable.
- [ ] Open questions tracked; none block MVP scope.
- [ ] All Tier-2 decisions made in this stage have ADRs.

## C.3 Gate 3 — Architecture Chosen
- [ ] Architecture style chosen and justified (ADR).
- [ ] Stack decisions recorded (frontend, backend, data, auth, hosting, observability).
- [ ] Data model drafted: entities, relations, key indexes, migration strategy.
- [ ] Integration points identified and their failure modes noted.
- [ ] Security model documented: threat model v0, auth flow, data classification.
- [ ] Scale expectations quantified (users, requests, data volume) — even if rough.
- [ ] Local-dev strategy defined (docker-compose / native / dev containers).
- [ ] CI/CD shape chosen (not necessarily wired yet).
- [ ] At least one rejected alternative per major decision captured in ADR.

## C.4 Gate 4 — Design System Ready
- [ ] Brand genesis: tone, adjectives, anti-adjectives defined.
- [ ] Color palette: primary, neutral, semantic (success/warn/error/info) in both light and dark modes, each with accessible contrast pairs.
- [ ] Typography scale: font families (display/body/mono), sizes, weights, line heights.
- [ ] Spacing scale and grid system defined.
- [ ] Motion principles (duration, easing) defined.
- [ ] Elevation / surface / border system defined.
- [ ] Iconography approach chosen (set, size rules).
- [ ] Component character (buttons, inputs, cards, nav) sketched.
- [ ] Tokens implemented in code (CSS vars, theme files, or framework equivalents).
- [ ] Light and dark modes functional on sample screens.
- [ ] Accessibility: color contrast AA minimum for all token pairings.

## C.5 Gate 5 — IA & UX Flows Complete
- [ ] Sitemap / navigation structure drafted.
- [ ] Primary flows diagrammed (happy path + at least one error path each).
- [ ] Wireframes or low-fi mockups exist for every Must-Have screen.
- [ ] Empty / loading / error / offline / permission-denied / rate-limited states designed.
- [ ] Copy drafted (not lorem-ipsum) for hero moments, CTAs, error messages.
- [ ] Voice-and-tone guidelines documented.
- [ ] Accessibility checklist reviewed: keyboard paths, focus management, ARIA, motion-reduce, contrast.
- [ ] Responsive breakpoints defined and flows reviewed at each.

## C.6 Gate 6 — Scaffold Ready
- [ ] Repo initialized with agreed structure.
- [ ] Package manager pinned (`.nvmrc` / `.tool-versions` / `package.json#engines`).
- [ ] Lint, format, type-check configured and passing on empty scaffold.
- [ ] Commit hooks (lint-staged / husky) installed.
- [ ] Tests runnable (even if just one smoke test).
- [ ] CI pipeline runs lint + test + type-check on PR.
- [ ] `.env.example` documented; secrets never in git.
- [ ] README + CONTRIBUTING + SECURITY + LICENSE files present.
- [ ] First conventional commit on main.
- [ ] Branch-protection rules on main (no force-push, require PR).

## C.7 Gate 7 — Implementation Complete (MVP)
- [ ] Every Must-Have FR has at least one test covering its acceptance criteria.
- [ ] All Must-Have user stories pass their acceptance criteria manually.
- [ ] Error handling is explicit, typed, user-facing where needed.
- [ ] Loading / empty / error states implemented on every data-driven screen.
- [ ] Forms have validation, inline errors, success states, disabled-submit while pending.
- [ ] Auth flows work end-to-end (sign up, sign in, sign out, password reset, session expiry).
- [ ] All network calls handle timeout, offline, 401, 403, 404, 409, 422, 429, 5xx.
- [ ] i18n scaffold in place even if shipping one locale.
- [ ] No TODOs / FIXMEs left in shipped code paths (or each has a ticket).
- [ ] No `console.log` / `print` in production paths (or explicitly gated).
- [ ] Secrets / tokens never logged.
- [ ] Feature flags added for risky features.

## C.8 Gate 8 — Quality Engineered
- [ ] Test pyramid: unit > integration > e2e, each level passing.
- [ ] Coverage of critical paths ≥ agreed target (typically 70–80% line coverage for MVP).
- [ ] All tests run in CI on every PR.
- [ ] Accessibility audit: automated (axe) + manual keyboard walkthrough + screen-reader spot-check.
- [ ] Performance audit: Lighthouse ≥ 90 on key pages, or equivalent native metric.
- [ ] Security audit: dependency scan, secret scan, `npm audit` / equivalent clean or triaged, authentication tested.
- [ ] Load test on critical endpoints, results documented.
- [ ] Browser / device matrix tested (at least: latest Chrome, Safari, Firefox, one mobile).
- [ ] Visual regression (if applicable) passing.

## C.9 Gate 9 — Observability in Place
- [ ] Structured logs on every service, with correlation IDs.
- [ ] Metrics: RED (rate/errors/duration) on every public endpoint; USE (utilization/saturation/errors) on resources.
- [ ] Distributed tracing or at least request IDs propagated through the stack.
- [ ] Error tracking (Sentry or equivalent) wired with source maps.
- [ ] Product analytics events for activation, key actions, drop-off points.
- [ ] PII scrubbed from logs / errors / analytics.
- [ ] Dashboards created for: traffic, errors, p95 latency, saturation, key product metrics.
- [ ] Alerts configured for: error-rate spike, p95 breach, availability drop, disk/memory pressure, queue depth.
- [ ] On-call / notification channel defined (even if it's just the user's own phone).

## C.10 Gate 10 — Pre-Ship Hardening
- [ ] Code freeze window respected (only critical fixes land).
- [ ] Changelog up to date.
- [ ] Version tagged (SemVer).
- [ ] Privacy policy and terms of service published.
- [ ] Cookie / data disclosure matches actual collection (Appendix B.13).
- [ ] Licenses of all dependencies reviewed and compatible with chosen product license.
- [ ] SEO basics: meta tags, Open Graph, favicon set, sitemap, robots.txt.
- [ ] Social share previews render correctly on at least Twitter/X and LinkedIn.
- [ ] 404 and 500 pages exist and are on-brand.
- [ ] Content proofread — no placeholder text anywhere user-visible.
- [ ] Accessibility statement drafted (if shipping publicly).

## C.11 Gate 11 — Deployment Ready
- [ ] Production environment provisioned.
- [ ] Secrets configured via secret manager (not in env files in the repo).
- [ ] TLS certificates valid and auto-renewing.
- [ ] DNS records correct, CAA records restrict issuers, DMARC/SPF/DKIM set for email domains.
- [ ] CDN configured; cache rules reviewed.
- [ ] Database migrations tested forward and backward.
- [ ] Backup strategy verified by test-restore.
- [ ] Rollback procedure documented and rehearsed.
- [ ] Canary or blue-green plan defined for first deploy.
- [ ] Feature flags for all risky paths default to "off" in prod.
- [ ] Status page / incident comms channel ready.
- [ ] Legal, billing, and third-party accounts are the user's, not Claude's.

## C.12 Gate 12 — Post-Ship Stable
- [ ] First 48 hours: error rate below pre-ship baseline by [target].
- [ ] First 7 days: no SEV-1 incidents.
- [ ] Activation metric trending at or above projection.
- [ ] All incidents (if any) have post-mortems.
- [ ] Backlog triaged, next iteration planned.
- [ ] Deprecation calendar maintained for any temporary choices.


# Appendix D — Common Failure Modes & Recoveries

Recognise each pattern, apply the recovery.

## D.1 Brief Drift
**Symptom:** What Claude is building no longer resembles Stage-1 intent. PRD still says X; code implements Y.
**Cause:** Quiet scope creep across many small Tier-1 decisions; no one re-read the PRD.
**Recovery:**
1. Stop implementation.
2. Diff current state vs Stage-1 brief and PRD.
3. For each deviation, decide: (a) update PRD to reflect new intent, or (b) revert the implementation.
4. If the shift is material, escalate to user before continuing (Tier 3).
**Prevention:** Re-read the brief at every gate. Explicit "PRD still true?" checkbox in gate templates.

## D.2 Stacked Assumptions
**Symptom:** Five files of fresh code rest on three unconfirmed assumptions. If one is wrong, most of it is wasted.
**Cause:** Assumption Ledger was populated but never revisited.
**Recovery:**
1. Halt new work.
2. Validate assumptions cheapest-first: search memory, search chat history, write a one-screen test prompt to confirm with the user, run a targeted experiment.
3. Adjust code after validation, not before.
**Prevention:** Gate rule — no more than 3 open high-falsification-cost assumptions may cross a gate boundary.

## D.3 Test Theatre
**Symptom:** 85% coverage. Every test passes. Obvious bug ships.
**Cause:** Tests assert implementation, not behaviour. Mocks return what the code expects. No acceptance-criteria-driven tests.
**Recovery:**
1. Write one end-to-end test per user story that exercises real components (or real environments where feasible).
2. Delete tests that duplicate what the type-checker already guarantees.
3. Add property-based tests for pure logic if applicable.
**Prevention:** Every user story's DoD includes "automated test that fails if the acceptance criterion is violated".

## D.4 Silent Breakage
**Symptom:** A background job fails daily. Nobody notices for three weeks.
**Cause:** The job has no SLO, no alert, no heartbeat.
**Recovery:**
1. Add a heartbeat ping (e.g., push to Healthchecks.io on success).
2. Add an alert that fires if no heartbeat within expected interval.
3. Add a log + metric for success/failure count.
4. Write a runbook.
**Prevention:** Every scheduled job inherits the "three-signal minimum": structured log, success metric, heartbeat.

## D.5 Migration That Cannot Be Rolled Back
**Symptom:** Deploy goes out, users start failing, rollback of the app fails because the new code expects a column the old code can't produce — and the migration already ran.
**Cause:** Destructive or non-backward-compatible migration shipped in the same release as the code that uses it.
**Recovery (mid-incident):**
1. Roll forward, not back — hotfix forward to a state that works with the current schema.
2. Restore from backup only as last resort.
**Prevention:** Expand-contract migrations. Phase 1 adds the new column/table (optional). Phase 2 ships code that writes to both. Phase 3 backfills. Phase 4 ships code that reads from new. Phase 5 drops the old. Never combine two phases in one release.

## D.6 Secret Leakage
**Symptom:** A secret appears in a committed `.env`, a log line, an error message shown to the user, or a screenshot in the docs.
**Cause:** Weak gates, no secret scanner, no log scrubbing.
**Recovery:**
1. Rotate the secret immediately.
2. Audit access logs for misuse during exposure window.
3. If the secret was in git history, use `git filter-repo` (or BFG) to purge and force-push after coordination; assume public exposure means compromise regardless.
4. Add secret scanning (gitleaks / trufflehog) to pre-commit and CI.
**Prevention:** `.env.example` only. Secret manager in prod. Log scrubbing middleware. Pre-commit hook.

## D.7 Dependency Avalanche
**Symptom:** Upgrade `foo` → 47 transitive deps change → unrelated feature breaks → type errors in library code you don't maintain.
**Cause:** Over-eager blanket updates.
**Recovery:**
1. Roll back to last-known-good lockfile.
2. Upgrade one major dep at a time on its own branch.
3. Run full test suite per upgrade.
**Prevention:** Renovate or Dependabot with grouped minor/patch PRs but per-package major PRs. Never auto-merge majors.

## D.8 Deploy Without Observability
**Symptom:** App is live. Something feels off. No dashboards. No logs. No idea what's happening.
**Cause:** Observability treated as a Phase 2 luxury.
**Recovery:**
1. Before any further feature work: wire structured logs, error tracking, and one RED metric per endpoint.
2. Ship these changes as the highest priority.
**Prevention:** Gate 9 is not optional. No ship without it.

## D.9 Accessibility Ignored
**Symptom:** Shipped app is unusable by keyboard, breaks screen readers, or fails contrast.
**Cause:** A11y treated as cosmetic, not structural.
**Recovery:**
1. Run axe-core or equivalent to enumerate violations.
2. Fix in priority: keyboard traps → missing labels → contrast → focus-visible → ARIA misuse.
3. Do a keyboard-only walkthrough of each primary flow.
**Prevention:** Gate 5 and Gate 8 include a11y. Component library wraps primitives that ship accessible by default.

## D.10 Privacy Drift
**Symptom:** Analytics is collecting email addresses in a `click_event.label` field. GDPR request can't be honoured because data is spread across three SaaS tools.
**Cause:** No data flow map. Analytics instrumentation without review.
**Recovery:**
1. Inventory every third party receiving user data.
2. Scrub PII from analytics payloads in a middleware layer.
3. Build an export / delete pipeline that covers all systems.
**Prevention:** Disclosure matrix (Appendix B.13) is authored before first user signs up. Every analytics event gets reviewed for PII.

## D.11 Over-Scoped MVP
**Symptom:** Eight weeks in, MVP still isn't shippable. Every week adds scope faster than it subtracts.
**Cause:** Non-ruthless prioritization. Every "should-have" crept into "must-have".
**Recovery:**
1. Cut the MVP in half. Decide what 50% can ship in two weeks.
2. Ship that. Measure. Then decide the next slice.
**Prevention:** MoSCoW discipline at Gate 2. A "must-have" that isn't on the critical path to the primary metric is a "should-have".

## D.12 Perfect Architecture, No Users
**Symptom:** Clean Kubernetes cluster, pristine microservices, event sourcing — three weekly actives.
**Cause:** Building for imagined scale, not real demand.
**Recovery:**
1. Collapse to a modular monolith.
2. Shut down unused services.
3. Redirect effort to user-visible value.
**Prevention:** ADR #1 should ask, "What's the simplest architecture that could work for the next 12 months?" and start there.

## D.13 Context Amnesia
**Symptom:** Claude re-asks questions already answered earlier in the conversation or in past chats / memory.
**Cause:** Skipped memory / conversation-search before asking.
**Recovery:**
1. Search memory and past conversations for the detail.
2. Apologise briefly if the user had to repeat themselves, and update working context.
**Prevention:** Before any clarification question, consult memory and past-chat tools.

## D.14 Autonomy Abuse
**Symptom:** Claude made a Tier-3 decision autonomously (registered a domain, emailed a real stakeholder, chose the brand name) and the user is rightly unhappy.
**Cause:** Misclassified reversibility tier.
**Recovery:**
1. Acknowledge without excuse.
2. Revert whatever is revertible.
3. Document why the misclassification happened.
4. Tighten the autonomy contract in context so it doesn't recur.
**Prevention:** Default to a higher tier when uncertain. "Could this embarrass or cost the user if wrong?" = Tier 3.

## D.15 Runbook Rot
**Symptom:** During an incident, the runbook references a service that was renamed six months ago and a dashboard URL that 404s.
**Cause:** Runbooks not maintained; never drilled.
**Recovery:**
1. Update during post-mortem.
2. Schedule quarterly runbook drills.
**Prevention:** Every runbook has a "last reviewed" date; CI warns when > 90 days old.

# Appendix E — Glossary

**ADR (Architecture Decision Record):** A document capturing an architecturally significant decision, the options considered, the chosen path, and its consequences. See B.2.

**Assumption Ledger:** Append-only list of unverified beliefs that the plan depends on, each with a falsification cost and an invalidation check. See I.4 and B.4.

**Autonomy Contract:** Operating principle set under which Claude does the work without intervention while honouring reversibility tiers, verification gates, and stop-and-ask triggers. See Part I.

**Blameless post-mortem:** An incident review that focuses on systems and processes, never individual fault. See B.7.

**Canary deploy:** Releasing a new version to a small fraction of traffic first, then expanding if health signals are good.

**CI/CD:** Continuous Integration / Continuous Deployment. Automation that builds, tests, and (in CD) deploys code on every change.

**Contract-first:** Designing the API or data contract between components before implementing either side.

**CRDT:** Conflict-free Replicated Data Type. Data structures designed for concurrent, distributed edits that converge without central coordination.

**Decision Registry:** Append-only log of Tier-1 and Tier-2 decisions with context, options, choice, rationale, and revisit trigger. See I.3 and B.3.

**Definition of Done (DoD):** The explicit checklist that must be true for a piece of work to be considered complete. See B.5.

**Expand-contract migration:** Multi-phase schema change that maintains backward compatibility at every step. See D.5.

**Feature flag:** Runtime switch that enables or disables a feature without redeploying. See B.8.

**Gate:** A falsifiable checkpoint between stages. No gate, no advance.

**MoSCoW:** Prioritization frame — Must / Should / Could / Won't. See PRD template B.1.

**NFR (Non-Functional Requirement):** Requirements that describe how the system behaves rather than what it does — performance, security, accessibility, etc.

**OKLCH:** A perceptually uniform color space (L = lightness, C = chroma, H = hue). Preferred for designing color systems because equal numeric steps feel equal visually.

**PRD (Product Requirements Document):** The canonical document describing what is being built and why. See B.1.

**RED metrics:** Rate (requests/sec), Errors (error rate), Duration (latency). Standard service-level observability triplet.

**Reversibility tier:** 0–3 classification of how costly a decision is to undo. Determines who decides. See I.2.

**RICE:** Prioritization formula — (Reach × Impact × Confidence) / Effort.

**Runbook:** Operational procedure for a specific task or incident class. See B.6.

**SemVer:** Semantic Versioning — MAJOR.MINOR.PATCH where MAJOR is breaking, MINOR is additive, PATCH is fix-only.

**SLI / SLO / SLA:** Service Level Indicator (what we measure), Service Level Objective (what we target internally), Service Level Agreement (what we contractually promise).

**SPA / SSR / SSG / ISR:** Single-Page App / Server-Side Rendering / Static Site Generation / Incremental Static Regeneration. Rendering strategies.

**STRIDE:** Threat-model mnemonic — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. See B.12.

**Tier 0/1/2/3:** Claude's reversibility classification. Tier 0 decide-and-forget; Tier 1 decide-and-log; Tier 2 decide-log-flag-ADR; Tier 3 stop-and-ask.

**USE metrics:** Utilization, Saturation, Errors. Standard resource-level observability triplet.

**Vertical slice:** A thin, end-to-end implementation of one user story touching every layer of the stack, rather than building a layer at a time.

---

# Closing Principle

The measure of this skill is not lines of code produced, features delivered, or hours autonomous. It is: **did Claude ship something the user trusts?** Trust is earned by honesty about what was decided and why, ruthlessness about what was cut and why, and visible care for the thing being built and the person it belongs to. Everything in this document serves that.

*End of skill.*
