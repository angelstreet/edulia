# 06 — EduliaHub Architecture

## What is EduliaHub?

The public-facing learning hub. Anyone can sign up, browse courses, track progress, collect certificates, and build a portfolio. No institution required.

**Edulia** = school/institution admin (private, invitation-based)
**EduliaHub** = learning marketplace + portfolio (public, self-signup)

Same backend, same database, different frontend.

## How it differs from Skilljar

| | Skilljar | EduliaHub |
|---|---|---|
| Model | B2B — companies pay to host academies | B2C — learners use it directly |
| Content | Hosted on platform | Links to external providers |
| Customer | Anthropic, Cisco, etc. | Individual learners |
| Revenue | SaaS per company | Freemium (free browse, paid features) |
| Ecosystem | Closed per-company | Open shared catalog |
| Open source | No | Yes (AGPL-3.0) |

## Repo structure

One repo, two frontends, one backend:

```
edulia/
  apps/
    web/              -- School admin frontend (existing)
                         Port 3000, edulia.angelstreet.io
    api/              -- Shared backend (existing, extended)
                         Port 8000
    hub/              -- EduliaHub frontend (NEW)
                         Port 3002, hub.edulia.angelstreet.io
      package.json
      vite.config.ts
      tsconfig.json
      index.html
      public/
        favicon.ico
        edulia-icon.png
        edulia-logo.png
      src/
        main.tsx
        App.tsx
        app/
          router.tsx
          providers.tsx
        features/
          landing/        -- Hub landing page
          auth/           -- Self-signup, login
          catalog/        -- Browse courses & platforms
          course/         -- Course detail, reviews
          certificates/   -- My certificates, upload
          portfolio/      -- My portfolio, public page
          curriculum/     -- Browse national programs
          community/      -- Discussions, comments
          profile/        -- User settings
        components/
          layout/         -- HubShell, Navbar, Footer
          common/         -- Shared UI (cards, ratings, badges)
        hooks/
        stores/
        api/              -- Axios clients for hub endpoints
        i18n.ts
        locales/
          fr/
          en/
        styles/
  docs/
```

## Shared vs separate

### Shared (one instance)
- PostgreSQL database
- FastAPI backend (`apps/api/`)
- Auth system (JWT, user table)
- File storage (MinIO)
- Course, certificate, curriculum tables

### Separate (two instances)
- Frontend apps (web/ vs hub/)
- PM2 processes (different ports)
- Domains (edulia vs hub.edulia)
- UI/UX (admin vs consumer)
- Nav structure

## URLs

| Service | Local | Production |
|---|---|---|
| School admin | localhost:3000 | edulia.angelstreet.io |
| Hub | localhost:3002 | hub.edulia.angelstreet.io |
| API (shared) | localhost:8000 | edulia.angelstreet.io/api |

Both frontends call the same API at `/api/*`. API routes are prefixed:
- `/api/admin/*` — school admin endpoints (require institutional role)
- `/api/hub/*` — hub endpoints (require self-signup auth)
- `/api/public/*` — no auth (course catalog, public portfolios)

## Auth model

| Flow | Edulia (admin) | EduliaHub |
|---|---|---|
| Sign up | Invitation only (admin invites) | Self-signup (email + password) |
| Roles | admin, teacher, student, parent, etc. | learner (default), contributor |
| Access | Tenant-scoped (one school) | Global (all public content) |
| SSO | Shared JWT — log into hub, also logged into admin if you have a role | Same |

One user can be both:
- A teacher on Edulia (invited by school)
- A learner on EduliaHub (self-signed up)
- Same account, same email, different contexts

## Backend: new modules

Add to `apps/api/app/modules/`:

```
modules/
  hub/
    __init__.py
    router.py           -- Hub-specific routes
    schemas.py
    service.py
  catalog/
    __init__.py
    router.py           -- Course & platform CRUD + search
    schemas.py
    service.py
  certificates/
    __init__.py
    router.py           -- Certificate upload + management
    schemas.py
    service.py
  portfolio/
    __init__.py
    router.py           -- Portfolio CRUD + public view
    schemas.py
    service.py
  curriculum/
    __init__.py
    router.py           -- Browse curriculum frameworks
    schemas.py
    service.py
  reviews/
    __init__.py
    router.py           -- Ratings & reviews
    schemas.py
    service.py
```

## Database: new tables

All tables defined in `05-COURSES-AND-PORTFOLIO.md`. Summary:

| Table | Purpose |
|---|---|
| `curriculum_framework` | National program (FR, UK, etc.) |
| `curriculum_level` | Cycle/grade within framework |
| `curriculum_competency` | Individual learning objective |
| `learning_platform` | Provider directory (Coursera, AWS, etc.) |
| `course` | Individual course link + metadata |
| `course_competency` | Course ↔ competency mapping |
| `skill_domain` | Career-oriented skill categories |
| `certificate` | User-uploaded proof of completion |
| `portfolio` | User's public profile |
| `course_review` | Star rating + comment on course |
| `platform_review` | Star rating on platform |
| `review_vote` | Helpful/not helpful votes |

## Hub frontend pages

### Public (no auth)
| Page | Path | Description |
|---|---|---|
| Landing | `/` | Hero, featured courses, platform logos, CTA |
| Course catalog | `/courses` | Browse/filter/search all courses |
| Course detail | `/courses/:id` | Description, formats, reviews, "Go to course" |
| Platform directory | `/platforms` | Grid of learning platforms |
| Platform detail | `/platforms/:slug` | About, courses from this platform |
| Curriculum browser | `/curriculum` | Browse by country/cycle/grade/subject |
| Public portfolio | `/u/:slug` | User's public certificate/skill page |
| Login | `/login` | Email + password |
| Sign up | `/signup` | Self-registration |

### Authenticated (learner)
| Page | Path | Description |
|---|---|---|
| Dashboard | `/dashboard` | My progress, recent courses, cert count |
| My courses | `/my-courses` | Bookmarked/started courses with progress |
| My certificates | `/certificates` | Grid of uploaded certs, upload button |
| Upload cert | `/certificates/new` | Form: title, provider, file, verification URL |
| My portfolio | `/portfolio` | Edit bio, headline, toggle public |
| Settings | `/settings` | Account, notifications, language |
| Write review | `/courses/:id/review` | Star rating + comment form |

### Admin/Contributor
| Page | Path | Description |
|---|---|---|
| Add course | `/admin/courses/new` | Add course to catalog |
| Moderate | `/admin/moderate` | Review community-submitted courses |
| Curriculum editor | `/admin/curriculum` | Edit competency data (future) |

## Hub landing page

Same theme system as Edulia landing (shared `useLandingTheme` hook). Different content:

**Hero**: "Your learning, organized."
**Subtitle**: "Browse free courses. Collect certificates. Build your portfolio. Show the world what you know."

**Sections**:
1. Course catalog preview (featured courses grid)
2. Platform logos (trusted providers)
3. How it works: Browse → Learn → Prove → Share
4. Curriculum highlight ("Aligned with national programs")
5. Portfolio preview ("Your achievements, one link")
6. CTA: Sign up free

## Deployment

### PM2
```bash
# Hub frontend
pm2 start "npx vite --host 0.0.0.0 --port 3002" \
  --name edulia-hub --cwd /opt/edulia/hub
```

### Nginx (on openclaw VM)
```nginx
server {
    server_name hub.edulia.angelstreet.io;
    location / {
        proxy_pass http://192.168.0.120:3002;
    }
    location /api/ {
        proxy_pass http://192.168.0.120:8000;
    }
}
```

### Cloudflare
- A record: `hub.edulia` → same IP as `edulia`
- Proxied (orange cloud)

### Vercel (production)
- Separate Vercel project: `eduliahub`
- Root: `apps/hub/`
- Same GitHub repo, different root directory

## Tech stack

Identical to Edulia admin frontend:

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui + Lucide |
| State | Zustand |
| i18n | i18next (fr/en) |
| API client | Axios |
| Routing | react-router-dom v7 |

## Implementation phases

### Phase 1: Scaffold + catalog (1-2 days)
- Create `apps/hub/` with Vite + React
- Landing page
- Course catalog (browse, filter, search)
- Platform directory
- Seed 15 platforms + 20 courses
- Self-signup auth

### Phase 2: Certificates + portfolio (1-2 days)
- Certificate upload
- Portfolio page (edit + public view)
- LinkedIn sharing
- Dashboard with progress

### Phase 3: Reviews + community (1 day)
- Star ratings on courses and platforms
- Written reviews with helpful votes
- Community course submissions

### Phase 4: French curriculum (2-3 days)
- Parse Cycle 2 Bulletin Officiel
- Structured competency browser
- Map courses to competencies
- Teacher validation

### Phase 5: Career mapping (1 day)
- Skill domains + career paths
- "Learn this → Become this" recommendations
- Course suggestions based on goals

## Revenue model (future)

| Tier | Price | Features |
|---|---|---|
| Free | 0 | Browse catalog, 3 certificates, basic portfolio |
| Pro | ~5€/mo | Unlimited certs, custom portfolio URL, analytics |
| Institution | Per seat | Connect to Edulia admin, assign courses, bulk reporting |

---

## Key decisions

1. **Same repo, separate frontend** — shared backend, shared DB, no duplication
2. **Link out, don't host** — no copyright issues, no storage costs, infinite catalog
3. **France first** — start with French curriculum, expand later
4. **Open source** — AGPL-3.0, same as Edulia
5. **Consumer UX** — not admin. Clean, engaging, discovery-oriented
