# 03 — Tutoring Scope

Simpler than school. Focuses on 1:1 or small-group private tutoring. Think tutoring centers, independent tutors, or coaching businesses.

---

## Data Model (Tutoring-specific — extends Core)

### Tutor Profile

```
TutorProfile
├── id (uuid)
├── user_id (fk → User)
├── tenant_id (fk)
├── subjects (fk[] → Subject)
├── bio (text)
├── hourly_rate (decimal, nullable) — individual session rate
├── group_rate (decimal, nullable) — per-group rate (tutor paid same regardless of group size)
├── availability_default (jsonb) — weekly template
│   e.g. [{ day: 1, start: "09:00", end: "18:00" }, ...]
├── max_students (int, nullable)
├── experience_years (int, nullable)
├── qualifications (text, nullable)
├── created_at
└── updated_at
```

### Booking / Session

```
TutoringSession
├── id (uuid)
├── tenant_id (fk)
├── tutor_id (fk → User)
├── student_id (fk → User)
├── subject_id (fk, nullable)
├── group_id (fk, nullable) — for small group sessions
├── type (enum: individual | group)
├── start_time (datetime)
├── end_time (datetime)
├── duration_minutes (int)
├── location (enum: online | in_person | hybrid)
├── location_details (text, nullable) — room, address, or video link
├── recurrence_rule (text, nullable) — RRULE for recurring
├── recurrence_group_id (uuid, nullable) — links recurring sessions
├── status (enum: scheduled | confirmed | completed | cancelled | no_show)
├── cancelled_by (fk, nullable)
├── cancellation_reason (text, nullable)
├── cancelled_at (nullable)
├── notes (text, nullable) — tutor session notes
├── created_at
└── updated_at
```

### Tutor Availability Override

```
AvailabilityOverride
├── id (uuid)
├── tutor_id (fk → User)
├── date (date)
├── type (enum: unavailable | custom_hours)
├── start_time (time, nullable)
├── end_time (time, nullable)
├── reason (text, nullable)
├── created_at
```

### Learning Plan

```
LearningPlan
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk → User)
├── tutor_id (fk → User)
├── subject_id (fk)
├── title (e.g. "Math catch-up plan")
├── goals (rich text)
├── start_date (date)
├── target_date (date, nullable)
├── status (enum: active | completed | paused)
├── created_at
└── updated_at

LearningPlanEntry
├── id (uuid)
├── plan_id (fk)
├── date (date)
├── session_id (fk, nullable)
├── notes (rich text) — what was covered
├── progress_rating (enum: struggling | improving | on_track | exceeding)
├── next_steps (text)
├── created_at
```

### Package / Subscription

```
Package
├── id (uuid)
├── tenant_id (fk)
├── name (e.g. "10-hour pack", "Monthly unlimited")
├── type (enum: hours | sessions | subscription)
├── total_hours (decimal, nullable) — for hour packs
├── total_sessions (int, nullable) — for session packs
├── price (decimal)
├── currency (default "EUR")
├── validity_days (int, nullable) — expires after X days
├── is_active (bool)
├── created_at
└── updated_at

StudentPackage (purchased package)
├── id (uuid)
├── package_id (fk)
├── student_id (fk → User)
├── purchased_at
├── expires_at (nullable)
├── hours_remaining (decimal, nullable)
├── sessions_remaining (int, nullable)
├── status (enum: active | expired | exhausted | cancelled)
├── created_at
└── updated_at
```

### Invoicing

```
TutoringInvoice (reuses core Invoice model with context_type: "tutoring")
├── id (uuid)
├── tenant_id (fk)
├── number
├── billed_to (fk → User) — student or parent
├── tutor_id (fk → User)
├── period_start (date)
├── period_end (date)
├── sessions (fk[] → TutoringSession) — linked sessions
├── package_id (fk, nullable)
├── items (jsonb) — [{description, hours, rate, total}]
├── subtotal (decimal)
├── tax (decimal)
├── total (decimal)
├── status (enum: draft | sent | paid | overdue)
├── due_date (date)
├── paid_at (nullable)
├── payment_method
├── created_at
└── updated_at
```

---

## Features by Module

### 1. Tutor Calendar & Availability

- Default weekly availability (template)
- Date-specific overrides (holidays, sick days)
- Visual calendar showing booked vs available slots
- Sync with external calendar (iCal export, Google/Outlook later)

**UI — Tutor Calendar:**
```
┌──────────────────────────────────────────────────┐
│  Mon calendrier          [◀ Semaine 10 Mar ▶]    │
│  [Jour] [Semaine] [Mois]    [⚙ Disponibilités]  │
├──────┬────────┬────────┬────────┬────────┬──────┤
│      │ Lun    │ Mar    │ Mer    │ Jeu    │ Ven  │
├──────┼────────┼────────┼────────┼────────┼──────┤
│ 9:00 │▓ Lucas │        │▓ Emma  │        │▓ Hugo│
│      │ Math   │        │ Franç. │        │ Math │
├──────┼────────┼────────┼────────┼────────┼──────┤
│10:00 │▓ Chloé │        │        │▓ Lucas │      │
│      │ Phys.  │        │        │ Math   │      │
├──────┼────────┼────────┼────────┼────────┼──────┤
│11:00 │ ░ free │ ░ free │▓ Léo   │ ░ free │░ free│
├──────┼────────┼────────┼────────┼────────┼──────┤
│14:00 │▓ Grp.A │        │        │▓ Grp.B │      │
│      │ 3 élèv.│        │        │ 4 élèv.│      │
├──────┼────────┼────────┼────────┼────────┼──────┤
│      │        │ ██ OFF │        │        │██ OFF│
└──────┴────────┴────────┴────────┴────────┴──────┘
│  ▓ = booked  ░ = available  ██ = unavailable     │
│  This week: 8 sessions | 10h tutored | 2 free   │
└──────────────────────────────────────────────────┘
```

### 2. Booking & Scheduling

- Admin or parent books a session on available slot
- Tutor confirms or auto-confirms (configurable)
- Reschedule flow (propose new time → confirm)
- Cancel with reason + policy (e.g. 24h notice)
- Recurring sessions (weekly same slot)
- Package hours deducted on session completion
- Notifications: booking confirmation, reminder (24h before), cancellation

**UI — Book a Session:**
```
┌──────────────────────────────────────────────────┐
│  Réserver une séance                             │
├──────────────────────────────────────────────────┤
│  Élève:    [Lucas BERNARD ▼]                     │
│  Tuteur:   [M. Dupont ▼]                         │
│  Matière:  [Mathématiques ▼]                     │
│  Type:     (●) Individuel  ( ) Petit groupe      │
│  Lieu:     (●) En ligne  ( ) Sur place           │
│                                                  │
│  Créneaux disponibles — Semaine du 10/03:        │
│  ┌────────────────────────────────────────────┐  │
│  │ Lun 10  │ ○ 11:00  ○ 15:00  ○ 16:00      │  │
│  │ Mer 12  │ ○ 10:00  ○ 14:00               │  │
│  │ Jeu 13  │ ○ 11:00  ○ 15:00               │  │
│  │ Ven 14  │ ○ 09:00  ○ 11:00               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Récurrence: [Aucune ▼] / Hebdomadaire           │
│  Forfait:    [Pack 10h — 7h restantes ▼]         │
│                                                  │
│  [Réserver]  [Annuler]                           │
└──────────────────────────────────────────────────┘
```

### 3. Session Attendance & Notes

- Mark session: completed / no-show / cancelled
- Tutor writes session notes (what was covered)
- Link to learning plan entry
- Hours deducted from package on completion

### 4. Learning Plans & Progress

- Per-student, per-subject plan
- Goals and milestones
- Session-by-session progress notes
- Progress rating (struggling → exceeding)
- Parent can view progress summary

**UI — Student Progress (Parent View):**
```
┌──────────────────────────────────────────────────┐
│  Suivi de Lucas — Mathématiques                  │
│  Tuteur: M. Dupont          Plan: Math catch-up  │
├──────────────────────────────────────────────────┤
│  OBJECTIF: Rattraper le niveau en algèbre        │
│  Début: 15/01  Cible: 15/04  Status: En cours    │
├──────────────────────────────────────────────────┤
│  HISTORIQUE DES SÉANCES                          │
│  ┌────────┬─────────────────────┬──────────────┐ │
│  │ Date   │ Contenu             │ Progression  │ │
│  ├────────┼─────────────────────┼──────────────┤ │
│  │ 06/03  │ Équations 1er degré │ ↗ Improving  │ │
│  │ 27/02  │ Calcul littéral     │ → On track   │ │
│  │ 20/02  │ Factorisation       │ ↗ Improving  │ │
│  │ 13/02  │ Développement       │ ↘ Struggling │ │
│  │ 06/02  │ Bilan initial       │ ↘ Struggling │ │
│  └────────┴─────────────────────┴──────────────┘ │
│                                                  │
│  📈 Tendance: Amélioration constante             │
│  Prochaine séance: Jeu 13/03 à 11h00            │
│  Prochain objectif: Inéquations                  │
└──────────────────────────────────────────────────┘
```

### 5. Packages & Billing

- Define packages (10h, 20h, monthly, etc.)
- Assign package to student
- Auto-deduct hours on session completion
- Low-balance alerts
- Auto-generate invoices (monthly or per package)
- Payment tracking
- Parent payment portal

**UI — Tutor Dashboard:**
```
┌──────────────────────────────────────────────────┐
│  Tableau de bord — M. Dupont                     │
├──────────────────────┬───────────────────────────┤
│  AUJOURD'HUI         │  STATS DU MOIS           │
│  ┌────────────────┐  │  Sessions: 24            │
│  │ 09:00 Lucas    │  │  Heures: 30h             │
│  │   Math — 1h    │  │  Revenus: €1,500         │
│  │ 10:00 Chloé    │  │  Taux complétion: 96%    │
│  │   Physique—1h  │  │                          │
│  │ 14:00 Groupe A │  │  ALERTES                 │
│  │   3 élèves—1h  │  │  ⚠ Emma: 2h restantes   │
│  └────────────────┘  │  ⚠ Hugo: facture impayée │
├──────────────────────┤  📅 Léo: pas de séance   │
│  MES ÉLÈVES (6)      │    depuis 2 semaines     │
│  Lucas B. — 7h left  │                          │
│  Emma D. — 2h left ⚠│                          │
│  Léo F. — 5h left    │                          │
│  Chloé M. — 12h left │                          │
│  Hugo M. — 0h left ⚠│                          │
│  Groupe A — 8h left  │                          │
└──────────────────────┴───────────────────────────┘
```

### 6. Assignments & Materials

- Tutor assigns homework between sessions
- Share documents/exercises
- Student can submit online
- Lightweight — reuses core assignment model

### 7. Lightweight Assessments

- Quick progress quizzes (reuse Quiz module, simplified)
- Tutor notes as informal assessment
- No formal gradebook — just progress tracking

---

## Tutoring vs School — Shared vs Unique

| Component | School | Tutoring | Shared? |
|-----------|--------|----------|---------|
| Users/Auth | ✅ | ✅ | ✅ Core |
| Groups | Classes/sections | Tutoring groups | ✅ Core (different type) |
| Messaging | ✅ | ✅ | ✅ Core |
| Files | ✅ | ✅ | ✅ Core |
| Notifications | ✅ | ✅ | ✅ Core |
| Timetable | Weekly grid | Calendar-based | ❌ Different UI |
| Attendance | Per-session roll call | Per-booking mark | Partial |
| Gradebook | Full grades + averages | Progress ratings | ❌ Different |
| Homework | Cahier de textes | Simple assignments | Partial |
| Quizzes | Full QCM builder | Lightweight quizzes | ✅ Same engine |
| Billing | School invoices | Package-based | Partial |
| Booking | N/A | Full booking engine | ❌ Tutoring only |
| Packages | N/A | Hour/session packs | ❌ Tutoring only |
| Learning plans | N/A | Per-student plans | ❌ Tutoring only |
| Report cards | Full bulletins | N/A | ❌ School only |
| Vie scolaire | Sanctions/incidents | N/A | ❌ School only |
| Enrollment | Online forms | Simple registration | Partial |

---

## Acceptance Criteria

| Feature | Criteria |
|---------|----------|
| Booking | Parent books a session in < 3 clicks from available slots |
| Calendar | Tutor sees full week with all sessions in < 2 seconds |
| Package | Hours deducted automatically on session completion |
| Progress | Parent sees session history + progress trend per subject |
| Invoice | Auto-generated monthly invoice with all sessions listed |
| Cancel | Cancellation within policy triggers refund/credit to package |
| Notifications | Booking confirmation sent within 1 minute |
| Recurring | Set up weekly recurring session with one action |
