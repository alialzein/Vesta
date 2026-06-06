# Personal Intelligence Brief — Product & Implementation Plan

**Project:** Vesta AI Chief of Staff  
**Feature:** Personal Intelligence Brief  
**Status:** Future feature / product plan  
**Recommended phase:** After core Outlook + AI dashboard pilot is stable  
**Target file path:** `docs/product/personal-intelligence-brief-plan.md`

---

## 1. Purpose

The Personal Intelligence Brief is a future Vesta feature that gives each manager a short, personalized daily briefing based on their interests, role, company priorities, clients, markets, and selected topics.

This should not be generic news. It should answer:

```txt
What happened today that matters to this manager?
Why does it matter?
What should the manager do with it?
```

The goal is to make Vesta feel like a real executive assistant, not only an email/task assistant.

---

## 2. Product Principle

The main Today dashboard must stay focused on actionable work.

Therefore:

> **News and intelligence should not appear above Today’s Radar.**

Use this priority rule:

```txt
Work first.
Urgent decisions first.
Personal intelligence second.
General news never first.
```

The Personal Intelligence Brief should live mainly in a separate page, with only a small optional mention on the Today dashboard later.

---

## 3. Recommended Placement

### Primary Placement

Add a dedicated sidebar page under `Intelligence`:

```txt
Today
Waiting on Me
Follow-ups
Draft Replies

Intelligence
Delegation
Memory & Rules
Briefing
Weekly Review
```

Recommended page name:

```txt
Briefing
```

Alternative names:

```txt
Personal Briefing
Executive Brief
Intelligence Brief
Daily Briefing
```

Recommended final name:

```txt
Briefing
```

### Secondary Placement

Later, on the Today dashboard, show only a small low-priority card **below Today’s Radar**, such as:

```txt
Briefing ready: 10 updates selected for you
```

Do not show news above the work queue.

### Right AI Rail Placement

When no work item is selected, the right AI Assistant Rail may show a small briefing preview:

```txt
Today Assistant
- Top risk
- Upcoming reminders
- Briefing ready
```

When a work item is selected, the right rail must focus on that item, not news.

---

## 4. What the Feature Should Do

The Personal Intelligence Brief should collect, rank, summarize, and explain updates that matter to the manager.

Potential categories:

```txt
Technology news
AI news
Cybersecurity
Industry news
Company news
Client news
Competitor news
Market updates
Regulatory updates
Country/region updates
Vendor/supplier updates
Internal company announcements later
```

Each item should include:

```txt
Title
Short summary
Why it matters to the manager
Suggested action
Source name
Source link
Topic/category
Confidence/relevance score
Published time
Save/share/dismiss controls
```

Example output:

```txt
1. New AI data regulation announced in the UAE
Why it matters: May affect how the company stores customer data in AI workflows.
Suggested action: Share with Legal and IT for review.
```

---

## 5. Onboarding Questions

Before enabling the feature, ask the manager what they care about.

### 5.1 Role and Work Context

Questions:

```txt
What is your role?
Which departments do you manage or interact with most?
Which decisions do you usually make?
Which topics should Vesta consider important for your role?
```

Example answers:

```txt
Managing Director
Operations, Finance, IT, HR
Client delivery, approvals, contracts, hiring, vendor decisions
```

### 5.2 Topics of Interest

Ask:

```txt
Which topics do you want in your daily briefing?
```

Options:

```txt
AI and technology
Cybersecurity
Business and markets
Industry news
Regulations
Competitors
Clients
Vendors
Hiring and HR
Finance and economy
Local country news
Global news
```

Allow custom topics:

```txt
Add custom topic: "Microsoft 365 Copilot updates"
Add custom topic: "UAE data privacy law"
Add custom topic: "Construction industry procurement"
```

### 5.3 Company Context

Ask:

```txt
Which company, clients, competitors, and vendors should Vesta track?
```

Fields:

```txt
Company name
Main clients
Competitors
Vendors/suppliers
Products/services
Countries/markets
```

### 5.4 Delivery Preferences

Ask:

```txt
When do you want the briefing?
How many items should Vesta show?
Should urgent work hide the news until later?
Which languages do you prefer?
```

Suggested controls:

```txt
Delivery time: 8:30 AM
Items per day: 5 / 10 / 15
Show only after urgent work is cleared: yes/no
Languages: English / Arabic / French / mixed
Tone: short executive summary / detailed analysis
```

### 5.5 Source Preferences

Ask:

```txt
Do you prefer global sources, local sources, specific publications, or company-approved sources only?
```

Controls:

```txt
Allowed sources
Blocked sources
Preferred regions
Preferred languages
```

---

## 6. Personalization Model

The feature should use two layers of personalization.

### 6.1 Structured Preferences

Store hard preferences such as:

```txt
Topics
Companies
Clients
Competitors
Countries
Languages
Delivery time
Number of items
Source allowlist/blocklist
Hide-until-work-cleared rule
```

Recommended future table:

```txt
briefing_preferences
```

### 6.2 Semantic Interests

Store softer interests such as:

```txt
Manager cares about AI productivity tools.
Manager wants cybersecurity updates only when they affect Microsoft 365 or enterprise systems.
Manager cares about UAE and GCC regulations.
Manager wants competitor updates summarized as business impact, not general news.
```

Recommended future storage:

```txt
manager_memories
```

or a dedicated future table:

```txt
briefing_interest_memories
```

---

## 7. Future Data Model Draft

Do not implement these tables until the feature phase starts. This is a planning draft only.

### 7.1 briefing_preferences

Purpose: one row per manager/user.

Possible fields:

```txt
id
user_id
enabled
delivery_time
timezone
items_per_day
languages
preferred_tone
hide_until_urgent_work_cleared
preferred_sources
blocked_sources
topics
companies
clients
competitors
countries
metadata
created_at
updated_at
```

### 7.2 briefing_sources

Purpose: configured source providers and feeds.

Possible fields:

```txt
id
source_name
source_type
source_url
language
region
is_enabled
trust_level
metadata
created_at
updated_at
```

### 7.3 briefing_items

Purpose: raw or processed news/intelligence items.

Possible fields:

```txt
id
source_id
external_id
url
title
summary
published_at
author
language
raw_content_hash
raw_payload
created_at
updated_at
```

### 7.4 user_briefing_items

Purpose: personalized ranking of briefing items for one user.

Possible fields:

```txt
id
user_id
briefing_item_id
brief_date
rank
relevance_score
why_it_matters
suggested_action
category
status -- unread/read/saved/dismissed/shared
created_at
updated_at
```

### 7.5 daily_briefings

Purpose: generated daily briefing package.

Possible fields:

```txt
id
user_id
brief_date
title
summary
sections
created_by_model
created_at
```

---

## 8. Future AI Behavior

The AI should not simply summarize news. It should personalize it.

### AI Responsibilities

- Deduplicate similar articles.
- Rank by manager relevance.
- Summarize in concise executive language.
- Explain why the item matters.
- Suggest a possible action.
- Avoid clickbait.
- Avoid overwhelming the manager.
- Respect source preferences and blocked topics.

### Output Schema Draft

```json
{
  "title": "New cybersecurity guidance for Microsoft 365 tenants",
  "summary": "A new security advisory recommends stricter mailbox access monitoring and admin consent review.",
  "why_it_matters": "Your company depends on Microsoft 365 and Vesta will later require Graph permissions, so this may affect rollout policy.",
  "suggested_action": "Ask IT to review admin consent and mailbox permission policies before production rollout.",
  "category": "cybersecurity",
  "relevance_score": 88,
  "confidence": 0.82,
  "source_name": "Example Source",
  "source_url": "https://example.com/article",
  "published_at": "2026-06-03T08:00:00Z"
}
```

### Safety Rules

- Never present unverified news as certain if confidence is low.
- Always show the source.
- Avoid making financial/legal/medical decisions for the user.
- For high-stakes topics, suggest review by the right internal person/team.
- Allow user to dismiss or correct topics.

---

## 9. UX Design

### 9.1 Briefing Page Structure

Recommended page:

```txt
Header
- Today’s Briefing
- Date
- Preferences button
- Refresh button

Top summary
- 10 updates selected for you
- Main themes today
- Highest-impact item

Sections
- Must Know
- Industry / Market
- Technology / AI
- Client / Competitor
- Regulation / Risk
- Saved for Later
```

### 9.2 Briefing Item Card

Each card:

```txt
Category chip
Title
2-line summary
Why it matters
Suggested action
Source + time
Buttons: Save, Share, Dismiss, More like this, Less like this
```

### 9.3 Controls

User controls:

```txt
More like this
Less like this
Hide this source
Follow this company
Stop tracking this topic
Save for weekly review
Share with team
```

### 9.4 Today Dashboard Integration

Do not show full news list on Today page.

Optional small module later below Today’s Radar:

```txt
Personal Briefing ready
10 updates selected for your interests
[Open Briefing]
```

Only show this after urgent work, not before it.

---

## 10. Feature Phases

### Phase A — Planning Only

Current phase.

Deliverables:

- This planning document.
- No code.
- No external news integration.
- No database migrations.

### Phase B — Demo Placeholder

Add a sidebar item and static demo page.

Scope:

- Demo-only `Briefing` page.
- Static demo data in `lib/demo-data.ts`.
- No API calls.
- No real news fetching.

### Phase C — Onboarding Preferences

Add onboarding questions and save user interests.

Scope:

- Preferences UI.
- Supabase tables for preferences.
- No real news ingestion yet.

### Phase D — Source Integration

Add real source collection.

Possible approaches:

- Company-approved RSS feeds.
- Curated sources.
- Internal newsletters.
- Search/news provider API only after privacy/security review.

### Phase E — AI Ranking and Daily Brief

Add AI ranking, deduplication, and personalized brief generation.

Scope:

- Relevance scoring.
- Why-it-matters explanation.
- Suggested action.
- Daily scheduled generation.

### Phase F — Company-wide Intelligence

For company-wide version:

- Department-level briefings.
- Leadership risk themes.
- Competitor/client tracking.
- Safe sharing across teams.

---

## 11. Testing Plan for Future Implementation

### 11.1 Unit Tests

When implemented, test:

- Topic matching.
- Source filtering.
- Blocked source logic.
- Deduplication logic.
- Ranking score calculation.
- User preference parsing.
- Language preference handling.

### 11.2 Component Tests

Test:

- Briefing page renders.
- Briefing cards render.
- Empty state renders.
- Loading state renders.
- Save/dismiss controls work locally.
- Preferences form works.
- Topic chips can be added/removed.

### 11.3 Integration Tests

When real APIs are added, mock:

- Source fetch success.
- Source fetch failure.
- Duplicate articles.
- Unsupported language.
- Empty results.
- AI ranking output validation.

### 11.4 E2E Tests

Test:

- User opens Briefing page.
- User sets interests.
- User sees personalized demo briefing.
- User saves an item.
- User dismisses an item.
- User changes preferences.

### 11.5 AI Output Validation Tests

Validate that AI output includes:

- Title.
- Summary.
- Why it matters.
- Suggested action.
- Source.
- Relevance score.
- Confidence.

Invalid AI JSON should not break the page.

---

## 12. Privacy and Security Considerations

The briefing feature may involve external content, source links, and personalization data.

Rules:

- Do not send confidential internal email content to external news services.
- Do not mix private manager emails with public news queries unless explicitly designed and reviewed.
- Store user interests clearly and allow editing/deletion.
- Show sources for all briefing items.
- Avoid hidden personalization that the user cannot control.
- Allow the user to disable the feature.
- Keep audit logs for preference changes once database phase exists.

---

## 13. Documentation Requirements

Store this file at:

```txt
docs/product/personal-intelligence-brief-plan.md
```

When implementation starts later, update:

```txt
docs/product/dashboard-ux-spec.md
docs/architecture/project-structure.md
docs/database/schema-v1.md
docs/testing/testing-strategy.md
```

If the feature becomes real, add:

```txt
docs/product/briefing-onboarding-questions.md
docs/security/news-and-external-sources.md
docs/ai/briefing-ai-behavior.md
```

---

## 14. Acceptance Criteria for This Planning File

This planning file is complete when:

- The feature purpose is clear.
- The feature is separated from the main Today dashboard.
- Onboarding questions are documented.
- Future data model is drafted.
- AI behavior is described.
- UX placement is defined.
- Testing requirements are listed.
- Privacy/security considerations are included.

No implementation is expected from this file yet.

---

## 15. Short Instruction to Coding Agent Later

When ready to implement only a demo placeholder, use:

```txt
Read docs/product/personal-intelligence-brief-plan.md.
Implement only Phase B: Demo Placeholder.
Add a static Briefing page with demo data only.
Do not add real news APIs, backend jobs, Supabase tables, or AI calls.
Update tests and docs.
Report using AGENTS.md format.
```
