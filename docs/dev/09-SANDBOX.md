# 09 — Sandbox & Demo Data

## Concept

A public demo sandbox where anyone can log in as any persona and explore the full app. Data resets every 10 minutes so no one can break it permanently.

## Demo Accounts

### Workspace 1: Ecole Moliere (School)

| Role | Email | Password | What they see |
|------|-------|----------|---------------|
| Admin | admin@demo.edulia.io | demo2026 | Full school management: 4 classes, 12 teachers, 120 students, timetable, grades, billing |
| Teacher | prof.martin@demo.edulia.io | demo2026 | 3 classes (6eA Maths, 5eB Maths, 4eA Maths), timetable, grade entry, homework, attendance |
| Teacher 2 | prof.dubois@demo.edulia.io | demo2026 | 2 classes (6eA Francais, 6eB Francais), same features |
| Student | emma.leroy@demo.edulia.io | demo2026 | Own schedule, grades (14.5 avg), homework, messages from teachers |
| Student 2 | lucas.moreau@demo.edulia.io | demo2026 | Different class (5eB), different grades (11.2 avg), pending homework |
| Parent | parent.leroy@demo.edulia.io | demo2026 | View Emma's schedule, grades, attendance (2 absences), message teacher |
| Parent 2 | parent.moreau@demo.edulia.io | demo2026 | View Lucas's grades, 1 unread message from teacher |

### Workspace 2: TutorPro Lyon (Tutoring)

| Role | Email | Password | What they see |
|------|-------|----------|---------------|
| Tutor | sophie@demo.edulia.io | demo2026 | 8 students, weekly sessions (Mon/Wed/Sat), attendance, invoicing |
| Student | julie.petit@demo.edulia.io | demo2026 | 2 sessions/week, progress notes |
| Parent | parent.petit@demo.edulia.io | demo2026 | Julie's schedule, invoices (1 unpaid), messages |

### Workspace 3: FormaTech SA (Enterprise)

| Role | Email | Password | What they see |
|------|-------|----------|---------------|
| HR Admin | rh@demo.edulia.io | demo2026 | 45 employees, 3 training programs, compliance dashboard |
| Employee | jean.dupont@demo.edulia.io | demo2026 | Assigned courses, schedule, completed certifications |

### EduliaHub

| Role | Email | Password | What they see |
|------|-------|----------|---------------|
| Learner | learner@demo.edulia.io | demo2026 | 5 bookmarked courses, 3 certificates, portfolio page |

## Seed Data: Ecole Moliere (main demo)

### Academic structure
- **Year:** 2025-2026
- **Terms:** Trimestre 1 (Sep 1 - Dec 20), Trimestre 2 (Jan 5 - Mar 28), Trimestre 3 (Mar 31 - Jul 4)
- **Classes:** 6eA (28 students), 6eB (26 students), 5eA (30 students), 5eB (25 students), 4eA (27 students)
- **Subjects:** Mathematiques, Francais, Histoire-Geo, SVT, Physique-Chimie, Anglais, EPS, Arts Plastiques, Musique, Technologie

### Timetable (6eA sample week)
| Time | Lundi | Mardi | Mercredi | Jeudi | Vendredi |
|------|-------|-------|----------|-------|----------|
| 08:00 | Maths (Martin, S101) | Francais (Dubois, S102) | Maths (Martin, S101) | Anglais (Smith, S201) | Francais (Dubois, S102) |
| 09:00 | Francais (Dubois, S102) | Maths (Martin, S101) | SVT (Bernard, Labo1) | Maths (Martin, S101) | Histoire (Lefevre, S103) |
| 10:00 | — | Histoire (Lefevre, S103) | — | Francais (Dubois, S102) | EPS (Garcia, Gym) |
| 11:00 | Anglais (Smith, S201) | SVT (Bernard, Labo1) | — | EPS (Garcia, Gym) | Musique (Roux, Musique) |
| 14:00 | Histoire (Lefevre, S103) | Arts (Moreau, Arts) | — | Physique (Laurent, Labo2) | — |
| 15:00 | Techno (Petit, Info1) | EPS (Garcia, Gym) | — | Techno (Petit, Info1) | — |

### Grades (Trimestre 1 for Emma Leroy, 6eA)
| Subject | Assessment 1 | Assessment 2 | Assessment 3 | Average |
|---------|-------------|-------------|-------------|---------|
| Maths | 16/20 | 14/20 | 15/20 | 15.0 |
| Francais | 13/20 | 15/20 | 14/20 | 14.0 |
| Histoire-Geo | 12/20 | 16/20 | — | 14.0 |
| SVT | 17/20 | 15/20 | — | 16.0 |
| Anglais | 14/20 | 13/20 | 15/20 | 14.0 |
| EPS | 16/20 | — | — | 16.0 |

### Attendance (Emma Leroy, last 2 weeks)
- Oct 14 Lundi 08:00 Maths — **Absent** (justified: medical)
- Oct 22 Mardi 11:00 SVT — **Late** (15 min)
- All other sessions: Present

### Homework
| Subject | Title | Due | Status (Emma) |
|---------|-------|-----|---------------|
| Maths | Exercices Ch.5 p.47 | Oct 28 | Submitted |
| Francais | Redaction: Mon animal | Oct 30 | Submitted (graded: 14/20) |
| Histoire | Frise chronologique | Nov 4 | Pending |
| SVT | Compte-rendu TP cellules | Nov 5 | Pending |

### Messages
| From | To | Subject | Date |
|------|-----|---------|------|
| Prof. Martin | Parents 6eA | Reunion parents-profs 15 nov | Oct 20 |
| Prof. Dubois | Parent Leroy | Progres en dictee | Oct 22 |
| Admin | All | Horaires modifies mercredi 6 nov | Oct 25 |
| Parent Leroy | Prof. Martin | Question sur le controle | Oct 23 |

### Wallet (TutorPro)
| Student | Balance | Last transaction |
|---------|---------|-----------------|
| Julie Petit | 45.00 EUR | -30.00 EUR (Oct session) |
| Parent Petit | — | Invoice: 120.00 EUR (Nov, unpaid) |

### Forms
| Form | Created by | Target | Responses |
|------|-----------|--------|-----------|
| Autorisation sortie musee | Admin | Parents 6eA | 22/28 |
| Satisfaction cantine | Admin | All students | 45/109 |

### Documents
| Name | Category | Uploaded by |
|------|----------|-------------|
| Reglement interieur 2025-2026.pdf | Official | Admin |
| Planning examens T1.pdf | Schedule | Admin |
| Cours Ch.5 Fractions.pdf | Course material | Prof. Martin |

## Technical Implementation

### Seed script: `scripts/seed_demo.py`

```python
"""
Creates all demo data in one transaction.
Idempotent: deletes existing demo tenants first, then recreates.
Run: python scripts/seed_demo.py
"""
# 1. Delete demo tenants (CASCADE deletes all related data)
# 2. Create 3 tenants (school, tutoring, enterprise)
# 3. Create users with roles
# 4. Create academic structure (years, terms, subjects, groups)
# 5. Create timetable (rooms + sessions)
# 6. Create attendance records (2 weeks)
# 7. Create gradebook (categories + assessments + grades)
# 8. Create homework (4 assignments + 2 submissions)
# 9. Create messages (4 threads)
# 10. Create wallet data (TutorPro)
# 11. Create forms (2 forms + responses)
# 12. Upload sample documents (3 files)
```

### Auto-reset: cron every 10 minutes

```bash
# /etc/cron.d/edulia-sandbox
*/10 * * * * jndoye cd /opt/edulia/backend && /opt/edulia/backend/venv/bin/python scripts/seed_demo.py --reset >> /var/log/edulia-sandbox.log 2>&1
```

The `--reset` flag:
1. Drops all data for demo tenants (DELETE WHERE tenant_id IN demo_ids)
2. Re-runs full seed
3. Takes ~2 seconds (small dataset)

No DB restore needed. No snapshot. Just delete + recreate.

### Alternative: PostgreSQL snapshot restore

If seed_demo.py is too slow or complex:

```bash
# One-time: create snapshot after seeding
pg_dump -U edulia -d edulia --data-only -t 'tenant_*' --where="id IN (demo_ids)" > /opt/edulia/demo_snapshot.sql

# Cron: restore every 10 min
*/10 * * * * psql -U edulia -d edulia -c "DELETE FROM tenant WHERE slug IN ('ecole-moliere','tutorpro-lyon','formatech-sa');" && psql -U edulia -d edulia < /opt/edulia/demo_snapshot.sql
```

### Demo mode flag

Add `?demo=true` to landing page URL to show a banner:

```
🎮 Demo mode — Data resets every 10 minutes. Log in with any account below.
```

With a dropdown showing all demo accounts + copy-paste passwords.

### Isolation

Demo tenants are regular tenants with a `is_demo = true` flag. They:
- Can't change their own password (UI hides it)
- Can't delete the tenant
- Can't invite new users (invite button hidden)
- Can modify everything else (that's the point — explore freely)

The cron just wipes and recreates, so any damage is temporary.

## Login Page Enhancement

Add a "Demo accounts" panel below the login form:

```
┌─────────────────────────────┐
│         Edulia Logo         │
│                             │
│  Email: [_______________]   │
│  Password: [____________]   │
│         [Log in]            │
│                             │
│  ─── Or try the demo ───   │
│                             │
│  🏫 School                  │
│    Admin    [Login →]       │
│    Teacher  [Login →]       │
│    Student  [Login →]       │
│    Parent   [Login →]       │
│                             │
│  📚 Tutoring                │
│    Tutor    [Login →]       │
│                             │
│  🏢 Enterprise              │
│    HR Admin [Login →]       │
│                             │
│  Data resets every 10 min   │
└─────────────────────────────┘
```

Each "Login" button auto-fills email + password and submits.

## File structure

```
scripts/
  seed_demo.py          # Main seed script
  seed_data/
    school.json         # Ecole Moliere data
    tutoring.json       # TutorPro data
    enterprise.json     # FormaTech data
    documents/          # Sample PDFs to upload
      reglement.pdf
      planning.pdf
      cours-fractions.pdf
```

## What this unlocks

Once seed_demo.py runs, **every WIRED workflow in 08-WORKFLOWS.md becomes a WORKS workflow.** The code is already there — it just needs data.

| Before seed | After seed |
|-------------|------------|
| 7 WORKS | 22 WORKS |
| 8 WIRED (empty) | 0 WIRED |
| 5 MOCK (fake dashboards) | 5 MOCK (still need dashboard API) |
| NO CODE items | Still NO CODE (need new code) |

The MOCK dashboards need separate work: replace hardcoded arrays with API calls to new stat endpoints.
