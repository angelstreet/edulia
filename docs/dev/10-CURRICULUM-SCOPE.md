# 10 — Curriculum Feature Scope

**Status:** Pre-build validation ✅
**Author:** Brainstorm 2026-03-08
**Goal:** Connect French gov curriculum → school program → learning content (EduliaHub + external)

---

## Problem we're solving

A parent wants to know:
> *"My daughter is in PS (age 3). What is she expected to learn per the French government, what has her school planned, and what can I use at home to help?"*

A school director wants to say in their sales pitch:
> *"Our program is fully aligned with the national curriculum. Every class is mapped to the official requirements."*

A teacher wants to see:
> *"When I create homework or an activity, what official competency does it address?"*

---

## Architecture — where data lives

```
GLOBAL (no tenant_id — shared DB, EduliaHub layer)
│
├── curriculum_frameworks      "Programme Cycle 1 — France 2021"
├── curriculum_domains         "Mobiliser le langage dans toutes ses dimensions"
├── curriculum_competencies    "Dire la suite des nombres jusqu'à trente"
├── course_competencies        links Course (catalog) → competency
│
TENANT-SCOPED (per school — Edulia layer)
│
├── learning_objectives        school maps competency → T1/W3 in their schedule
└── objective_content          links objective → activity, hub course, or external URL
```

**Key rule:**
- Gov curriculum data = **global**, lives once, available to all schools and EduliaHub
- School program = **tenant-scoped**, each school maps to their own sequence/timing
- Content links = **tenant-scoped** for school-created content; **global** for EduliaHub courses

---

## Data sourced — verification done ✅

### Source: eduscol.education.fr (PDFs, no API)

| Cycle | PDF | Pages | Status |
|---|---|---|---|
| Cycle 1 (PS/MS/GS) | `eduscol.education.fr/document/7883/download` | 32 | ✅ Accessible, parseable |
| Cycle 3 (CM1/CM2/6e) | `eduscol.education.fr/document/50990/download` | 108 | ✅ Accessible |
| Cycle 2 Français (2025) | `education.gouv.fr/sites/default/files/ensel135_annexe3.pdf` | — | Need to verify |
| Cycle 2 Maths (2025) | `education.gouv.fr/sites/default/files/ensel135_annexe4.pdf` | — | Need to verify |

### Extraction result (Cycle 1 validated):

| Framework | Domains | Competencies |
|---|---|---|
| FR-MENJ-C1-2021 (Maternelle) | 5 | 77 |

Extraction tool: `pdfplumber` (installed). 77 bullets auto-extracted from "Ce qui est attendu en fin d'école maternelle" sections.

### No official API exists
No JSON/XML/API from education.gouv.fr or data.gouv.fr. PDFs are the only source. No existing open-source dataset. We build this ourselves.

---

## DB Schema (new tables)

### Global tables (no TenantMixin)

```python
class CurriculumFramework(Base):
    __tablename__ = "curriculum_frameworks"
    id          = UUID, pk
    code        = String  # "FR-MENJ-C1-2021"
    name        = String  # "Programme de l'école maternelle — Cycle 1"
    country     = String  # "FR"
    cycle       = String  # "1" | "2" | "3" | "4"
    year        = Integer # 2021
    source      = String  # "BOENJS n°25 du 24 juin 2021"
    levels      = ARRAY   # ["PS", "MS", "GS"]

class CurriculumDomain(Base):
    __tablename__ = "curriculum_domains"
    id           = UUID, pk
    framework_id = FK → curriculum_frameworks
    code         = String  # "MATHS"
    name         = String  # "Acquérir les premiers outils mathématiques"
    sort_order   = Integer

class CurriculumCompetency(Base):
    __tablename__ = "curriculum_competencies"
    id           = UUID, pk
    domain_id    = FK → curriculum_domains
    code         = String  # "C1-MATHS-4_1_2-16"
    description  = Text    # "Dire la suite des nombres jusqu'à trente"
    sub_domain   = String  # "Nombres et quantités"
    levels       = ARRAY   # ["GS"] or ["CP","CE1"] etc.
    sort_order   = Integer

class CourseCompetency(Base):
    __tablename__ = "course_competencies"
    course_id      = FK → courses
    competency_id  = FK → curriculum_competencies
    # PK = (course_id, competency_id)
```

### Tenant-scoped tables

```python
class LearningObjective(Base, TenantMixin):
    __tablename__ = "learning_objectives"
    id            = UUID, pk
    competency_id = FK → curriculum_competencies
    term_id       = FK → terms (nullable)
    week_from     = Integer (nullable)
    week_to       = Integer (nullable)
    group_id      = FK → groups (nullable — specific to a class)
    notes         = Text    # teacher's own note
    status        = String  # "planned" | "in_progress" | "completed"

class ObjectiveContent(Base, TenantMixin):
    __tablename__ = "objective_content"
    id           = UUID, pk
    objective_id = FK → learning_objectives
    content_type = String  # "activity" | "hub_course" | "external_url" | "homework"
    content_ref  = String  # UUID (activity/course) or URL string
    label        = String  # display text for the link
    notes        = Text
```

---

## API Endpoints

### Global (no auth required)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/curriculum/frameworks` | List frameworks (FR cycle 1-4) |
| GET | `/api/v1/curriculum/frameworks/{code}` | Framework detail + domain list |
| GET | `/api/v1/curriculum/domains/{id}/competencies` | Competencies for a domain |
| GET | `/api/v1/curriculum/competencies/{id}` | Single competency + courses linked |
| GET | `/api/v1/curriculum/for-level/{level}` | All competencies for a level (e.g., PS) |

### School-scoped (require auth + tenant)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/v1/learning-objectives` | School's program (filters: term_id, group_id) |
| POST | `/api/v1/learning-objectives` | Map a competency to school schedule |
| PATCH | `/api/v1/learning-objectives/{id}` | Update status / timing / notes |
| DELETE | `/api/v1/learning-objectives/{id}` | Remove mapping |
| POST | `/api/v1/learning-objectives/{id}/content` | Link content to objective |
| GET | `/api/v1/curriculum/student/{student_id}` | Student's competencies + school plan + content |

---

## Frontend Views

### 1. Parent view — "Programme de [enfant]" (killer sales demo feature)

Route: `/children` → click on child → "Programme" tab

```
Léa — Petite Section de Maternelle

📚 Mathématiques — Nombres et quantités
   ├── 🏛️  [Programme officiel] Dire la suite des nombres jusqu'à trente
   │        Source: MENJ 2021 · Attendu en fin de GS
   ├── 🏫  [Notre programme] Abordé en T2 Semaine 3-4
   │        Note de l'enseignante: "Nous utilisons les comptines et jeux de dénombrement"
   └── 📎  [Ressources]
            ▶ Jeu de comptage (Activité Edulia)
            🔗 Lumni — Les chiffres en maternelle
            🔗 Mathador Junior

✅ Déjà couverts ce trimestre: 4/8 objectifs
🔵 En cours: 2/8
⬜ À venir: 2/8
```

### 2. Teacher/admin — "Planifier le programme"

Route: `/admin/curriculum` (admin/teacher only)

- Checklist of all gov competencies for their school's levels
- Click any competency → set term + weeks + notes
- Drag to reorder across the year
- See coverage: "12/77 competencies planned for Cycle 1"

### 3. EduliaHub — public curriculum browser

Route: `hub.edulia.angelstreet.io/curriculum`

- Browse by cycle / level / subject
- Each competency shows: description + linked courses
- No login needed — discovery tool that drives school demos

### 4. Activity/homework creation — tagging

When a teacher creates an activity or homework, add:
- Optional "Competency" field: search competencies, pick one
- Shows: "This activity addresses: Dire la suite des nombres (C1-MATHS)"

---

## Content linking strategy

### EduliaHub courses → competencies (manual/seed)

Tag existing courses with competency codes at seed time. Example:
```
Course: "Mathador Junior" → tags: ["C1-MATHS-4_1_2-16", "C1-MATHS-4_1_2-12"]
Course: "Lumni: le corps humain" → tags: ["C1-MONDE-5_2_2-03"]
```

### External content (iframe strategy)

Key free French sources to link:
| Source | Content | Integration |
|---|---|---|
| Lumni (lumni.fr) | Video + interactive, gov-backed, free | link out (lumni.fr blocks iframe) |
| Mathador | Math games | embeddable iframe |
| Khan Academy Kids | Early numeracy, literacy | link out |
| Canopé | Teacher resources | link out |
| La Classe Maternelle | Maternelle activities | link out |

**Iframe activity type:** Add `type: "external_url"` to Activity model. Teacher creates activity, pastes URL, student opens it inside Edulia (iframe or new tab based on site policy).

---

## Build phases

### Phase 1 — Data layer (2-3 days)
1. Add 5 new tables (migration)
2. Write PDF parser + seed script for Cycle 1 (77 competencies validated ✅)
3. Extend to Cycle 2/3 using LLM-assisted parsing
4. Seed `course_competencies` linking existing EduliaHub courses to ~20 competencies
5. API endpoints: `GET /curriculum/frameworks`, `GET /curriculum/for-level/:level`

### Phase 2 — School program mapping (2 days)
6. `LearningObjective` CRUD API + migration
7. Admin UI: checklist to plan competencies across the year
8. Objective status tracking

### Phase 3 — Parent view (2 days) ← THE DEMO MOMENT
9. "Programme de [child]" tab in `/children`
10. Shows: gov competency → school plan → linked resources
11. Term/subject navigation
12. Coverage progress bar

### Phase 4 — Content tagging (1 day)
13. Activity/homework creation: optional competency tag field
14. Show badge on completed activities: "Covers: [competency name]"

### Phase 5 — EduliaHub browser (1 day)
15. `/curriculum` page on hub.edulia — public, no auth
16. Browse by level, shows courses per competency

**Total: ~8-10 days from scratch. Phase 1-3 alone (~5 days) gives the sales demo.**

---

## Seed script plan

`scripts/seed_curriculum.py`:

```bash
python3 scripts/seed_curriculum.py           # seeds Cycle 1 (validated)
python3 scripts/seed_curriculum.py --cycle 2  # seeds Cycle 2 (needs parsing)
python3 scripts/seed_curriculum.py --reset    # drops and reseeds
```

Data files (generated, committed to repo):
```
scripts/curriculum_data/
  FR-C1-2021.json   # 5 domains, 77 competencies — generated from PDF ✅
  FR-C2-2025.json   # Cycle 2 (CP/CE1/CE2) — to build
  FR-C3-2023.json   # Cycle 3 (CM1/CM2/6e) — to build
  FR-C4.json        # Cycle 4 (5e/4e/3e) — to build
```

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| PDF structure changes per cycle (Cycle 3 is 108 pages, different format) | Parse Cycle 1 first; use LLM extraction for Cycles 2/3/4 |
| Some competencies get cut off mid-sentence (PDF line wrapping artifact) | Manual review + clean-up pass on extracted JSON before committing |
| School refuses to spend time mapping competencies | Provide a pre-filled default mapping (generic template), school just validates |
| Lumni/external sites block iframe | Use `window.open` fallback; add `target="_blank"` as backup |

---

## Next step to validate before building

1. ✅ PDF accessible and parseable (Cycle 1 proven)
2. ✅ 77 competencies extractable with clean structure
3. ⬜ Run full seed script → insert into dev DB → verify rows
4. ⬜ Build one minimal API endpoint `GET /api/v1/curriculum/for-level/GS` → verify JSON shape
5. ⬜ Build static parent view mockup → show to user for validation before full build

Only proceed to full build after step 4-5 pass.
