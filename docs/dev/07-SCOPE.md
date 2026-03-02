# 07 — Scope: What We're Building

## The Big Picture

Edulia is **two products in one repo** solving opposite sides of education:

| | Edulia (Admin) | EduliaHub (Learner) |
|---|---|---|
| **One-liner** | "Run your school" | "Own your learning" |
| **User** | Institutions (schools, tutors, companies) | Individual learners (anyone) |
| **Access** | Invitation-only | Self-signup, free |
| **Revenue** | Per-institution license | Freemium (free core, paid portfolio) |
| **Competitor** | Ecole Directe, Pronote, Google Classroom | Class Central, LinkedIn Learning, Open Badges |

---

## Edulia (Admin) — Full Scope

> An institution creates a workspace, invites staff/students/parents, manages everything.

### Scope 0: Foundation (DONE)
- [x] Multi-tenant architecture (one DB, isolated tenants)
- [x] Auth: JWT + RBAC (admin, teacher, student, parent, tutor)
- [x] Campus / academic year / term / subject / group management
- [x] User management + CSV bulk import
- [x] Dashboard (role-based, per-workspace-type)
- [x] Settings + module toggle per tenant

### Scope 1: Communication (DONE)
- [x] Messaging (threaded conversations, attachments)
- [x] Notifications (polling, read/unread)
- [x] File upload/download (MinIO S3)

### Scope 2: Landing & Public (DONE)
- [x] Public landing page with audience targeting
- [x] 3 themes (Fresh/Warm/Bold) with localStorage persistence
- [x] i18n (French + English)
- [x] Login/signup flow
- [x] "For Schools / For Tutors / For Enterprises / For Learners" nav

### Scope 3: Academic Core (NOT STARTED)
The heart of the school product. Without this, institutions won't pay.

| Module | What it does | Priority |
|--------|-------------|----------|
| **Timetable** | Weekly schedule per class/teacher, room allocation, conflict detection | P0 — everything depends on this |
| **Attendance** | Mark present/absent/late per session, linked to timetable | P0 — legal requirement |
| **Gradebook** | Grades per subject, weighted averages, report cards | P0 — parents need this |
| **Homework** | Assign/submit/grade homework, deadlines, attachments | P1 |
| **Report cards** | Term-end PDF generation, teacher comments, signatures | P1 |

### Scope 4: Administration (NOT STARTED)
Back-office tools for running the institution.

| Module | What it does | Priority |
|--------|-------------|----------|
| **Billing** | Invoicing, payment tracking, instalment plans | P1 |
| **Documents** | Official docs (enrollment forms, medical records), categorized | P2 |
| **Forms/Surveys** | Custom forms (parent consent, satisfaction surveys) | P2 |
| **Directory** | Staff/parent contact list, emergency contacts | P2 |
| **Calendar** | School calendar (holidays, events, exams), shared across roles | P1 |

### Scope 5: Advanced (FUTURE)
Nice-to-haves that differentiate from competitors.

| Module | What it does | Priority |
|--------|-------------|----------|
| **Analytics** | Student performance trends, attendance stats, class comparison | P2 |
| **Parent portal** | Parent-specific view: grades, attendance, messaging, billing | P1 |
| **Mobile app** | PWA or native wrapper for parents/students | P3 |
| **API/Integrations** | Webhook, LTI, SIS import/export | P3 |
| **AI assistant** | Smart scheduling, grade prediction, early warning | P3 |

### Workspace Types (config presets, same codebase)

| Type | Enabled modules | Hidden modules |
|------|----------------|----------------|
| **School** | Everything | — |
| **Tutoring center** | Timetable, attendance, billing, messaging | Gradebook, report cards, homework |
| **Enterprise training** | Timetable, attendance, certificates | Gradebook, parent portal, billing |

---

## EduliaHub (Learner) — Full Scope

> A learner signs up, browses courses, earns certificates, builds a public portfolio.

### Scope H0: Foundation (IN PROGRESS)
- [x] Separate frontend (`apps/hub/`)
- [x] Landing page ("Your learning, organized")
- [x] Shared backend with Edulia
- [x] Theme system (shared with Edulia)
- [x] i18n (fr/en)
- [ ] Self-signup auth (email + password)
- [ ] Learner dashboard

### Scope H1: Course Catalog
The core value prop — discover free learning resources.

| Feature | What it does | Status |
|---------|-------------|--------|
| **Platform directory** | 15+ learning platforms (Coursera, AWS, Khan Academy...) with descriptions, free/paid badges | DONE |
| **Course catalog** | Browse/search/filter courses by skill, platform, format, difficulty | NOT STARTED |
| **Course detail** | Description, provider link, reviews, "Go to course" button | NOT STARTED |
| **Course seeding** | Populate 50+ real free courses from major platforms | NOT STARTED |
| **Search & filters** | By subject, platform, difficulty, format (video/text/project), language | NOT STARTED |

Key rule: **we link to courses, never host content.** User clicks through to the provider's site.

### Scope H2: Certificates & Portfolio
The second value prop — prove what you learned.

| Feature | What it does | Status |
|---------|-------------|--------|
| **Certificate upload** | Upload PDF/image of completion certificate | NOT STARTED |
| **Certificate verification** | Optional URL to verify on provider's site | NOT STARTED |
| **Portfolio page** | Public profile: bio, skills, certificates grid | NOT STARTED |
| **Public URL** | `hub.edulia.angelstreet.io/u/username` | NOT STARTED |
| **LinkedIn sharing** | One-click share certificate/portfolio to LinkedIn | NOT STARTED |
| **Skill mapping** | Certificates mapped to skill categories | NOT STARTED |

### Scope H3: Reviews & Community
Social proof and engagement.

| Feature | What it does | Status |
|---------|-------------|--------|
| **Course reviews** | 1-5 star rating + written review | NOT STARTED |
| **Platform reviews** | Rate learning platforms overall | NOT STARTED |
| **Helpful votes** | Community votes on review quality | NOT STARTED |
| **Course suggestions** | Users submit new courses to catalog | NOT STARTED |
| **Moderation** | Flag/remove inappropriate reviews | NOT STARTED |

### Scope H4: French Curriculum
France-first curriculum alignment — unique differentiator.

| Feature | What it does | Status |
|---------|-------------|--------|
| **Curriculum browser** | Browse by cycle/grade/subject | NOT STARTED |
| **Competency mapping** | Courses tagged with curriculum competencies | NOT STARTED |
| **Cycle 2 (CP-CE2)** | French primary curriculum parsed from Bulletin Officiel | NOT STARTED |
| **Cycle 3 (CM1-6e)** | Extended primary | NOT STARTED |
| **Cycle 4 (5e-3e)** | Middle school | NOT STARTED |

Source: eduscol.education.fr PDFs — requires manual curation / AI parsing. No structured dataset exists.

### Scope H5: Career & Learning Paths (FUTURE)
Long-term engagement features.

| Feature | What it does | Status |
|---------|-------------|--------|
| **Skill domains** | Tech, business, creative, languages, sciences | NOT STARTED |
| **Career paths** | "Want to become X → learn these skills" | NOT STARTED |
| **Recommendations** | "Based on your certificates, try this next" | NOT STARTED |
| **Learning goals** | Set targets (e.g., "AWS certified by December") | NOT STARTED |
| **Progress tracking** | Completion %, streaks, milestones | NOT STARTED |

---

## How They Connect

```
┌─────────────────────────┐     ┌─────────────────────────┐
│      Edulia (Admin)     │     │     EduliaHub (Learner)  │
│                         │     │                         │
│  Schools manage         │     │  Anyone browses         │
│  students, grades,      │◄───►│  courses, collects      │
│  timetables, billing    │ SSO │  certificates, builds   │
│                         │     │  portfolio              │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────┬───────────────────┘
                         │
                ┌────────▼────────┐
                │  Shared Backend  │
                │  (FastAPI)       │
                │                  │
                │  - Users table   │
                │  - Courses       │
                │  - Certificates  │
                │  - Auth (JWT)    │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │  PostgreSQL 16   │
                └─────────────────┘
```

**Cross-links:**
- Edulia admin can assign EduliaHub courses to students
- Students complete courses on external platforms → upload cert to EduliaHub → visible in Edulia gradebook
- One account works on both (SSO)
- Institution can see learner progress from EduliaHub in their Edulia dashboard

---

## Revenue Model

| Tier | Price | Who | What |
|------|-------|-----|------|
| **EduliaHub Free** | 0 | Anyone | Browse courses, 3 certificates, basic portfolio |
| **EduliaHub Pro** | ~5 EUR/mo | Learners | Unlimited certs, custom URL, analytics, LinkedIn integration |
| **Edulia School** | Per-seat/year | Institutions | Full admin platform, all modules |
| **Edulia Enterprise** | Custom | Corporates | SSO, API, custom integrations, SLA |

---

## Build Order (What to do next)

### Phase 1 — EduliaHub MVP (now)
1. Course catalog with 50+ real courses (seeded)
2. Self-signup auth
3. Certificate upload
4. Basic portfolio page

### Phase 2 — Edulia Academic Core
5. Timetable module
6. Attendance
7. Gradebook + report cards

### Phase 3 — Growth
8. French curriculum (Cycle 2)
9. Reviews & community
10. EduliaHub Pro (paid tier)

### Phase 4 — Scale
11. Parent portal
12. Mobile PWA
13. Career paths & recommendations
14. API & integrations

---

## What We DON'T Do

| Don't | Why |
|-------|-----|
| Host course videos/content | Copyright, storage costs, impossible to compete with providers |
| Build our own LMS player | Reinventing the wheel — providers already do this well |
| Scrape external sites | Legal risk, maintenance nightmare |
| Target US/UK first | France has less competition, we know the system |
| Build mobile native | PWA first, native only if traction justifies it |
| Charge for basic access | Freemium drives adoption, premium drives revenue |

---

## Future Vision: Career Intelligence (Scope H6)

> Noted 2026-03-02 — not for MVP, but core to long-term differentiation.

### Concept
EduliaHub becomes a **career copilot**, not just a course browser. Users link their professional identity and we provide AI-powered career services.

### Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **LinkedIn import** | User connects LinkedIn → we pull profile, experience, skills, certifications | P2 |
| **Resume upload** | Parse PDF/DOCX resume → extract skills, experience, education | P2 |
| **Unified profile** | Merge: learning history (our data) + work experience (LinkedIn/resume) + certificates = full picture | P2 |
| **AI resume writer** | Generate/update resume incorporating new certificates and courses completed on the platform | P3 |
| **Learning recommendations** | "Based on your profile and career goals, take these courses next" | P2 |
| **Certification recommendations** | "These certifications would strengthen your profile for [target role]" | P2 |
| **Job matching** | Scrape/aggregate job postings → match with user's skill profile → suggest opportunities | P3 |
| **Interview prep** | AI-powered mock interviews tailored to the user's target role and skill gaps | P3 |
| **Skill gap analysis** | "You want to be a Cloud Architect. You have 70% of required skills. Missing: Kubernetes, Terraform" | P2 |
| **Career path visualization** | Interactive graph: current skills → target role → required courses → timeline | P3 |

### Data model (future)

```
user_profiles
  └── linkedin_data (JSON: imported profile snapshot)
  └── resume_file_id (FK → files)
  └── parsed_resume (JSON: structured experience/skills)
  └── career_goals (JSON: target roles, timeline)

skill_assessments
  └── user_id, skill_domain_id, level (beginner/intermediate/advanced)
  └── assessed_at, source (self|certificate|ai)

job_opportunities
  └── title, company, url, skills_required, location, salary_range
  └── match_score (computed per user)
```

### Why this matters
This turns EduliaHub from "browse free courses" into "manage your entire career growth." The moat: we have the user's learning history + professional background + career goals in one place. No one else combines all three.

### Dependencies
- Scope H1 (course catalog) must exist first
- Scope H2 (certificates/portfolio) must exist first
- LinkedIn API access (or manual import)
- AI model for resume parsing, recommendations, interview simulation
