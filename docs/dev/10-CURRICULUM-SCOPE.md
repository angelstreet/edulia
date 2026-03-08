# 10 — Curriculum Feature Scope

**Status:** Phase 1-3 SHIPPED ✅ · Phase 4-5 BACKLOG
**Last updated:** 2026-03-08
**Goal:** Connect French gov curriculum → school program → learning content → parent home use

---

## Problem we're solving

**Parent at home (use case 1 — priority):**
> *"My daughter is in PS (age 3). I want to let her learn to count and read in a funny way with games, videos, and audio — all aligned with what school expects."*

**Parent at home (use case 2 — La Fontaine, etc.):**
> *"She has to learn a poem for school (La Cigale et la Fourmi). I want the text, an audio reading, a video, or a game — from existing free resources, no content we create ourselves."*

**School director selling pitch:**
> *"Our program is fully aligned with the national curriculum. Every class is mapped to the official requirements, visible by parents in real time."*

**Teacher creating homework/activity:**
> *"Tag this activity to official competency C1-MATHS-16 so it appears in the parent's programme view."*

---

## Architecture — where data lives

```
GLOBAL (no tenant_id — shared DB, EduliaHub layer)
│
├── curriculum_frameworks      "Programme Cycle 1 — France 2021"
├── curriculum_domains         "Mobiliser le langage dans toutes ses dimensions"
├── curriculum_competencies    "Dire la suite des nombres jusqu'à trente"
└── course_competencies        links EduliaHub Course → competency
│
TENANT-SCOPED (per school — Edulia layer)
│
├── learning_objectives        school maps competency → T1/W3 in their schedule
└── objective_content          links objective → activity, hub course, or external URL
```

**Key rule:**
- Gov curriculum data = **global**, lives once, available to all schools and EduliaHub
- School program = **tenant-scoped**, each school maps to their own sequence/timing
- External resources (Lumni, YouTube, Mathador) = linked as `external_url` — we don't host anything

---

## Coverage: Can we go up to Baccalauréat (age 18)?

**YES** — France has official published programmes for all levels. No API exists; PDFs only.

| Cycle | Code | Ages | Levels | PDF Source | Competencies | Status |
|---|---|---|---|---|---|---|
| Maternelle | C1 | 3–6 | PS, MS, GS | eduscol.education.fr/document/7883/download | **77** | ✅ **Seeded** |
| Élémentaire | C2 | 6–9 | CP, CE1, CE2 | education.gouv.fr/ensel135_annexe3.pdf (Français) + annexe4.pdf (Maths) | ~120 est. | 🔴 PDF found, not parsed |
| Élémentaire–Collège | C3 | 9–12 | CM1, CM2, 6e | eduscol.education.fr/document/50990/download (108 pages) | ~200 est. | 🔴 PDF found, not parsed |
| Collège | C4 | 12–15 | 5e, 4e, 3e | eduscol.education.fr (by subject per level) | ~300 est. | 🔴 Not identified yet |
| Lycée | Lycée | 15–18 | 2nde, 1re, Tle | education.gouv.fr (by filière: générale, pro, techno) | ~400 est. | 🔴 Not identified yet |

**Key complexity:** C4 and Lycée are subject-by-subject (Maths, Français, Histoire-Géo, Sciences, etc.) — ~15 subjects × 3 years = many PDFs. C1–C3 are unified cross-subject by cycle.

**Realistic path:**
- C1–C3: parseable with our existing pdfplumber extractor (~1 week work)
- C4 + Lycée: require per-subject PDF hunt + LLM-assisted extraction (~2-3 weeks additional)
- **MVP target: C1 + C2 + C3 = covers ages 3–12** — primary school complete, covers the widest school market

---

## Data sourced

### Seeded today ✅

| Framework | Domains | Competencies | Status |
|---|---|---|---|
| FR-MENJ-C1-2021 (Maternelle) | 5 | 77 | ✅ In DB |

### Demo data for Mon Ecole (tenant)

| What | Detail |
|---|---|
| Student | Léa Rousseau, Petite Section (age 3) |
| Parent | Sophie Rousseau — `parent.rousseau@demo.edulia.io / demo2026` |
| School plan | 6 learning objectives mapped by school |
| Content links | 4 external resources (Lumni, Mathador) |
| View | `/children` → Léa → "Programme scolaire" |

---

## DB Schema

### Global tables (no TenantMixin)

```python
class CurriculumFramework(Base):
    __tablename__ = "curriculum_frameworks"
    id, code, name, country, cycle, year, source, levels

class CurriculumDomain(Base):
    __tablename__ = "curriculum_domains"
    id, framework_id, code, name, sort_order

class CurriculumCompetency(Base):
    __tablename__ = "curriculum_competencies"
    id, domain_id, code, description, sub_domain, levels, sort_order
```

### Tenant-scoped tables

```python
class LearningObjective(Base, TenantMixin):
    __tablename__ = "learning_objectives"
    id, competency_id, term_id, week_from, week_to, group_id, notes, status

class ObjectiveContent(Base, TenantMixin):
    __tablename__ = "objective_content"
    id, objective_id, content_type, content_ref, label, notes

# content_type values:
#   "external_url"  → link to Lumni, YouTube, Mathador, etc.
#   "youtube_embed" → embeddable YouTube player (if needed)
#   "activity"      → internal Edulia activity UUID
#   "hub_course"    → EduliaHub course UUID
#   "audio"         → direct audio file URL (public domain readings)
#   "text"          → link to text resource (Wikisource poem, etc.)
```

---

## Content types and free resources (verified 2026-03-08)

**Key principle:** We never host or create content. We are a **content directory** — we link existing free resources to official competencies. Parent clicks "resources" → opens in new tab. We store the link, label, and type.

### Content type enum in our DB

```
content_type = "external_url"   → link to any website (Lumni, Wikisource, Mathador...)
content_type = "youtube_embed"  → YouTube video with embeddable iframe (standard YT embed)
content_type = "audio"          → direct audio stream URL (litteratureaudio.com, audiocite.net)
content_type = "text"           → poem/text page (Wikisource, la-fontaine-ch-thierry.net)
content_type = "game"           → browser game (jeux.lumni.fr, lafontaine.net, ortholud.com)
content_type = "activity"       → internal Edulia interactive activity (UUID ref)
```

### Use case 1 — Learn to count / read at home (PS, age 3–6)

| Resource | Domain | Type | Ages | Free | Notes |
|---|---|---|---|---|---|
| **Lumni** | lumni.fr | video | 3–18 | ✅ | France TV + Radio France official edu platform; 10,000+ videos; gov-backed |
| **jeux.lumni.fr** | jeux.lumni.fr | game | 3–18 | ✅ | Browser games by level and subject |
| **Mathador** | mathador.fr | game | 7–14 | ✅ (free solo) | Mental math game by Réseau Canopé (official Ministry publisher); CE1–3ème |
| **Maître Lucas** | maitrelucas.fr | video | 5–11 | ✅ | #1 French primary school channel, animated, no ads, CP–CM2 |
| **Khan Academy** | fr.khanacademy.org | video + exercise | 11–18 | ✅ | Maths/sciences focus; YouTube-embeddable videos |
| **Réseau Canopé — Les Fondamentaux** | reseau-canope.fr | video | 6–15 | ✅ | ~500 animated short films on Maths, French, Sciences (Ministry-made) |
| **Bescherelle / ortholud.com** | ortholud.com | game | 6–15 | ✅ | Grammar/spelling games, no registration |

### Use case 2 — La Cigale et la Fourmi / poésie La Fontaine

La Fontaine (1621–1695) = **public domain everywhere**. Full coverage, all free.

#### Full text
| Resource | Domain | Type | Notes |
|---|---|---|---|
| **Wikisource — Fables complètes** | fr.wikisource.org | text | All fables, multiple editions, public domain |
| **la-fontaine-ch-thierry.net** | la-fontaine-ch-thierry.net | text | Illustrated + annotated fables |
| **lesfables.fr** | lesfables.fr | text + quiz | Full text + 10-question quiz per fable |

#### Audio readings (free, no registration)
| Resource | Domain | Type | Notes |
|---|---|---|---|
| **Littératureaudio.com** | litteratureaudio.com | audio (MP3 stream) | 110 fables, 3h25 total, free, no login |
| **Audiocite.net** | audiocite.net | audio (MP3 stream) | 1h10 selection, free, no login |
| **Internet Archive (LibriVox)** | archive.org | audio | Multiple public domain recordings |

#### Video for children (YouTube-embeddable)
| Resource | Domain | Type | Notes |
|---|---|---|---|
| **Les P'tits z'Amis** | YouTube channel | youtube_embed | 3M+ subscribers, animated fables incl. La Fontaine |
| **Lumni × Philharmonie des enfants** | lumni.fr | external_url | La Fontaine 400th anniversary: 6 songs by artists (Catherine Ringer, Olivia Ruiz, Kery James…) |

#### Games / quizzes on La Fontaine
| Resource | Domain | Type | Notes |
|---|---|---|---|
| **lafontaine.net** | lafontaine.net | game | 3 interactive games: "La Fable mystère", "Le jeu des morales", "Les Fables fantaisistes" |
| **lesfables.fr** | lesfables.fr | game | Quiz per fable |
| **webjunior.net** | webjunior.net | game | Child-facing quiz, designed for école primaire |

### Embed capability

| Resource | External link | YouTube iframe | Direct iframe |
|---|---|---|---|
| Lumni | ✅ | — | Conditional (ENT-gated — use external_url) |
| YouTube channels | ✅ | ✅ | — |
| Khan Academy exercises | ✅ | ✅ (videos only) | ❌ (auth walls) |
| Mathador | ✅ | — | Not confirmed |
| Wikisource / text sites | ✅ | — | Works but not designed for it |
| Audio sites | ✅ | — | Not confirmed |
| La Fontaine game sites | ✅ | — | Not confirmed |

**Default strategy:** always `external_url` (opens new tab). Upgrade to `youtube_embed` only for YouTube videos — the only reliably embeddable source.

---

## API Endpoints

### Implemented ✅

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/api/v1/curriculum/frameworks` | None | List all frameworks |
| GET | `/api/v1/curriculum/for-level/{level}` | None | Competencies for PS/MS/GS/CP/etc. |
| GET | `/api/v1/curriculum/student/{student_id}` | Auth | Student's competencies + school plan + content |

### Backlog

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/curriculum/domains/{id}/competencies` | Competencies for a domain |
| POST | `/api/v1/learning-objectives` | Map competency to school schedule |
| PATCH | `/api/v1/learning-objectives/{id}` | Update status / timing |
| POST | `/api/v1/learning-objectives/{id}/content` | Link external resource to objective |

---

## Frontend Views

### Shipped ✅

**Parent view — `/children/:id/programme`**

```
Léa — Petite Section
Programme officiel : Programme de l'école maternelle — Cycle 1 (BOENJS 2021)
Objectifs planifiés par l'école: 6 / 77

[Mobiliser le langage dans toutes ses dimensions] — 21 attendus · 2 planifiés
  LANGAGE ORAL ET DÉCOUVERTE DE L'ÉCRIT
  > Communiquer avec les adultes...  [Planifié] [1 ressource]
  > S'exprimer dans un langage oral...
  ...

[Agir, s'exprimer à travers l'activité physique]
[Agir, s'exprimer à travers les activités artistiques]
[Acquérir les premiers outils mathématiques]
[Explorer le monde]
```

### Backlog

- **Teacher/admin planning UI** — checklist to map competencies to terms/weeks
- **Resource management** — add/remove external links per objective
- **EduliaHub public browser** — `/curriculum` page, no login, drives school demos

---

## Build phases

| Phase | What | Status |
|---|---|---|
| 1 | DB tables + seed Cycle 1 (77 competencies) | ✅ **Shipped** |
| 2 | School program mapping (learning_objectives CRUD) | ✅ **Shipped** (seeded via script) |
| 3 | Parent view `/children/:id/programme` | ✅ **Shipped** |
| 4a | Seed Cycle 2 (CP–CE2, ages 6-9) | 🔴 Backlog |
| 4b | Seed Cycle 3 (CM1–6e, ages 9-12) | 🔴 Backlog |
| 4c | Seed Cycle 4 + Lycée (ages 12-18) | 🔴 Backlog (complex) |
| 5 | Teacher UI to plan + add content links | 🔴 Backlog |
| 6 | EduliaHub public curriculum browser | 🔴 Backlog |
| 7 | Activity/homework competency tagging | 🔴 Backlog |

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cycle 3 PDF (108 pages) has different structure | Use LLM extraction pass after pdfplumber text dump |
| C4 / Lycée = many subject-specific PDFs | Prioritize Maths + Français first (highest demand) |
| Schools won't map competencies manually | Provide default template mapping; school just validates |
| Lumni blocks iframe embedding | Use `target="_blank"` external link only |
| Poem text copyright | Use Wikisource (public domain — La Fontaine died 1695) |
