# 02 — School Scope (École Directe Parity)

Full feature specification for the School workspace. Every module below maps to a feature set found in École Directe, Pronote, or standard French school portals.

---

## Module 1: Timetable (Emploi du temps)

### Data Model
```
Session
├── id (uuid)
├── tenant_id (fk)
├── academic_year_id (fk)
├── group_id (fk) — class
├── subject_id (fk)
├── teacher_id (fk → User)
├── room_id (fk, nullable)
├── day_of_week (int: 0-6)
├── start_time (time)
├── end_time (time)
├── recurrence (enum: weekly | biweekly | custom)
├── effective_from (date)
├── effective_until (date)
├── status (enum: active | cancelled | substituted)
├── created_at
└── updated_at

Room
├── id (uuid)
├── tenant_id (fk)
├── campus_id (fk)
├── name (e.g. "Salle 201")
├── capacity (int)
├── equipment (text[]) — projector, lab, gym, etc.
├── created_at
└── updated_at

SessionException (substitution, cancellation, room change)
├── id (uuid)
├── session_id (fk)
├── date (specific date)
├── exception_type (enum: cancelled | substituted | room_change | time_change)
├── substitute_teacher_id (fk, nullable)
├── new_room_id (fk, nullable)
├── new_start_time (nullable)
├── new_end_time (nullable)
├── reason
├── created_by (fk)
├── created_at
└── updated_at
```

### Features
- Weekly / monthly / annual timetable views
- Per-student, per-teacher, per-class, per-room views
- Real-time updates (substitutions, cancellations reflected immediately)
- Room booking for teachers (check availability)
- Color-coded by subject
- Print / export to PDF
- Conflict detection (double-booking teacher or room)

### UI — Timetable Page
```
┌──────────────────────────────────────────────────────┐
│  Emploi du temps        [Week ◀ 24 Feb - 28 Feb ▶]  │
│  View: [Week] [Month] [Annual]   Class: [6ème A ▼]  │
├──────┬────────┬────────┬────────┬────────┬────────┤  │
│      │ Lundi  │ Mardi  │Mercredi│ Jeudi  │Vendredi│  │
├──────┼────────┼────────┼────────┼────────┼────────┤  │
│ 8:00 │▓ Math  │ Franç. │ Hist.  │▓ Math  │ Ang.   │  │
│      │ M.Dup. │ MmeMar.│ M.Leb. │ M.Dup. │ MsSmith│  │
│      │ S.201  │ S.105  │ S.302  │ S.201  │ S.108  │  │
├──────┼────────┼────────┼────────┼────────┼────────┤  │
│ 9:00 │ SVT    │ Phys.  │ Sport  │ Franç. │▓ Math  │  │
│      │ MmeDub.│ M.Gir. │ M.Pet. │ MmeMar.│ M.Dup. │  │
├──────┼────────┼────────┼────────┼────────┼────────┤  │
│10:00 │ — Rec— │ — Rec— │ — Rec— │ — Rec— │ — Rec— │  │
├──────┼────────┼────────┼────────┼────────┼────────┤  │
│10:15 │ Franç. │ Hist.  │        │ Musiq. │ SVT    │  │
│      │ MmeMar.│ M.Leb. │        │ MmeRoy │ MmeDub.│  │
├──────┼────────┼────────┼────────┼────────┼────────┤  │
│11:15 │ Ang.   │ Art    │        │ Phys.  │ Hist.  │  │
│      │ MsSmith│ MmeFon.│        │ M.Gir. │ M.Leb. │  │
└──────┴────────┴────────┴────────┴────────┴────────┘  │
                                                        │
│  Legend: ▓ = current session  🔴 = cancelled          │
│  [📥 Export PDF]  [🖨 Print]                          │
└──────────────────────────────────────────────────────┘
```

---

## Module 2: Attendance (Appel / Présences)

### Data Model
```
AttendanceRecord
├── id (uuid)
├── tenant_id (fk)
├── session_id (fk) — links to timetable session
├── student_id (fk → User)
├── date (date)
├── status (enum: present | absent | late | excused | sick)
├── late_minutes (int, nullable)
├── reason (text, nullable)
├── justified (bool, default false)
├── justified_by (fk → User, nullable) — parent or admin
├── justified_at (timestamp, nullable)
├── justification_document_id (fk → File, nullable)
├── recorded_by (fk → User) — teacher or vie scolaire
├── created_at
└── updated_at
```

### Features
- **Teacher roll call** — per session, quick toggle present/absent/late
- **Simplified primary school mode** — morning/afternoon only
- **Study hall attendance** — track students in study periods
- **Parent justification** — parent submits reason + document online
- **Vie scolaire management** — overview, batch operations, follow-up
- **Auto-notification** — parent alerted on absence/late
- **Reports** — by student, class, date range; absence rate; trends
- **Edit tracking** — all changes audited

### UI — Roll Call (Teacher)
```
┌──────────────────────────────────────────────────┐
│  Appel — 6ème A — Mathématiques — 01/03 08:00   │
│  [Save] [Cancel]                                 │
├────┬───────────────────┬───┬───┬───┬─────────────┤
│ #  │ Élève             │ P │ A │ R │ Note        │
├────┼───────────────────┼───┼───┼───┼─────────────┤
│ 1  │ BERNARD Lucas     │ ● │ ○ │ ○ │             │
│ 2  │ DUPONT Emma       │ ● │ ○ │ ○ │             │
│ 3  │ FAURE Léo         │ ○ │ ● │ ○ │ no justif.  │
│ 4  │ MARTIN Chloé      │ ○ │ ○ │ ● │ 5min        │
│ 5  │ MOREAU Hugo       │ ● │ ○ │ ○ │             │
│ ...│ ...               │   │   │   │             │
│ 28 │ VINCENT Sarah     │ ● │ ○ │ ○ │             │
├────┴───────────────────┴───┴───┴───┴─────────────┤
│  P=Present A=Absent R=Retard(Late)               │
│  Summary: 26 present, 1 absent, 1 late           │
│  [💾 Save & close]                               │
└──────────────────────────────────────────────────┘
```

### UI — Parent Absence View
```
┌──────────────────────────────────────────────────┐
│  Vie scolaire — Lucas BERNARD                    │
├──────────────────────────────────────────────────┤
│  ABSENCES                                        │
│  ┌────────┬───────────┬──────────┬─────────────┐ │
│  │ Date   │ Session   │ Status   │ Justified   │ │
│  ├────────┼───────────┼──────────┼─────────────┤ │
│  │ 28/02  │ Math 8h   │ Absent   │ ❌ Pending  │ │
│  │ 15/02  │ Franç 9h  │ Absent   │ ✅ Doctor   │ │
│  │ 03/02  │ Sport 14h │ Late 10m │ ✅ Bus      │ │
│  └────────┴───────────┴──────────┴─────────────┘ │
│                                                  │
│  [📝 Justify absence on 28/02]                   │
│  ┌──────────────────────────────────────────────┐│
│  │ Reason: [Médecin / Doctor visit  ▼]         ││
│  │ Comment: [________________________________] ││
│  │ Document: [📎 Upload justificatif]          ││
│  │ [Submit justification]                      ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

---

## Module 3: Gradebook (Notes & Évaluations)

### Data Model
```
GradeCategory
├── id (uuid)
├── tenant_id (fk)
├── subject_id (fk)
├── group_id (fk)
├── term_id (fk)
├── name (e.g. "Devoirs", "Contrôles", "Participation")
├── weight (decimal) — coefficient for category
├── created_at
└── updated_at

Assessment
├── id (uuid)
├── tenant_id (fk)
├── subject_id (fk)
├── group_id (fk)
├── term_id (fk)
├── category_id (fk → GradeCategory)
├── teacher_id (fk)
├── title (e.g. "Contrôle Chapitre 3")
├── description
├── date (date)
├── max_score (decimal, default 20)
├── coefficient (decimal, default 1)
├── is_published (bool) — visible to students/parents
├── created_at
└── updated_at

Grade
├── id (uuid)
├── assessment_id (fk)
├── student_id (fk → User)
├── score (decimal, nullable) — null = not graded yet
├── is_absent (bool)
├── is_exempt (bool)
├── comment (text, nullable) — per-student feedback
├── created_at
└── updated_at
```

### Features
- Grade entry per assessment with coefficient
- Automatic average calculation (per subject, per term, annual, general)
- Category weighting (e.g. tests=60%, homework=30%, participation=10%)
- Competency tracking (LSU for primary/collège, LSL for lycée)
- Grade publication control (draft → published)
- Student/parent view: grades, averages, class average, rank (optional)
- Teacher view: class grid, statistics (min, max, avg, median)
- Comments per student per assessment
- Grade change audit trail
- Export to CSV

### UI — Teacher Grade Entry
```
┌──────────────────────────────────────────────────────┐
│  Saisie de notes — 6ème A — Math — Contrôle Ch.3    │
│  Date: 28/02  Max: /20  Coeff: 2  [Save] [Publish]  │
├────┬───────────────────┬───────┬─────────────────────┤
│ #  │ Élève             │ Note  │ Commentaire         │
├────┼───────────────────┼───────┼─────────────────────┤
│ 1  │ BERNARD Lucas     │ [15 ] │ [Bon travail      ] │
│ 2  │ DUPONT Emma       │ [18 ] │ [Excellent         ] │
│ 3  │ FAURE Léo         │ [ABS] │ [Absent — rattrapage]│
│ 4  │ MARTIN Chloé      │ [12 ] │ [Revoir ch.3.2    ] │
│ 5  │ MOREAU Hugo       │ [09 ] │ [Efforts attendus ] │
│ ...│                   │       │                     │
├────┴───────────────────┴───────┴─────────────────────┤
│  Stats: Min 5 | Max 19 | Avg 13.2 | Median 13.5     │
│  ▁▂▃▅▇█▇▅▃▂▁  (distribution)                        │
│  [💾 Save draft]  [📢 Publish to students/parents]   │
└──────────────────────────────────────────────────────┘
```

### UI — Student Grade View
```
┌──────────────────────────────────────────────────┐
│  Mes notes — Trimestre 2                         │
├──────────────────────────────────────────────────┤
│  📕 Mathématiques          Moyenne: 14.5/20  ↑  │
│  ├── Contrôle Ch.3    15/20  coeff 2  (28/02)   │
│  ├── Exercice maison  16/20  coeff 1  (21/02)   │
│  └── Contrôle Ch.2   12/20  coeff 2  (07/02)   │
│                        Classe: 13.2 | Min: 5    │
│                                                  │
│  📗 Français               Moyenne: 12.2/20  →  │
│  ├── Dictée             14/20  coeff 1  (27/02) │
│  ├── Rédaction          10/20  coeff 2  (20/02) │
│  └── Grammaire          13/20  coeff 1  (10/02) │
│                        Classe: 11.8 | Min: 4    │
│                                                  │
│  📘 Histoire-Géo           Moyenne: 16.0/20  ↑  │
│  └── Contrôle Rev.Fr.  16/20  coeff 2  (25/02)  │
│                                                  │
├──────────────────────────────────────────────────┤
│  MOYENNE GÉNÉRALE: 13.8/20                       │
│  Rang: 5/28 (optional, if school enables)        │
└──────────────────────────────────────────────────┘
```

---

## Module 4: Homework Diary (Cahier de textes)

### Data Model
```
SessionContent (what was done in class)
├── id (uuid)
├── session_id (fk → Session from timetable)
├── teacher_id (fk)
├── date (date)
├── content (rich text) — lesson summary
├── attachments (fk[] → File) — PDFs, links, resources
├── created_at
└── updated_at

Homework
├── id (uuid)
├── tenant_id (fk)
├── subject_id (fk)
├── group_id (fk)
├── teacher_id (fk)
├── title
├── description (rich text)
├── assigned_date (date)
├── due_date (date)
├── due_session_id (fk, nullable) — linked to specific session
├── attachments (fk[] → File)
├── allow_submission (bool) — can students submit online?
├── submission_type (enum: file | text | both)
├── created_at
└── updated_at
```

### Features
- Auto-linked to timetable sessions (click session → fill content)
- Session content (what was covered) + homework (what to do)
- File attachments (PDFs, links, exercises)
- Students see upcoming homework sorted by due date
- Submission enabled per homework (online turn-in)
- Teacher can prepare sessions in advance
- Duplicate/copy sessions between terms

### UI — Homework View (Student)
```
┌──────────────────────────────────────────────────┐
│  Cahier de textes          [Semaine ◀ 24/02 ▶]  │
│  ☑ Show upcoming only                           │
├──────────────────────────────────────────────────┤
│  📅 Lundi 03/03                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ 📕 Mathématiques                             ││
│  │ Contenu: Chapitre 4 — Fractions (intro)     ││
│  │ 📎 cours_fractions.pdf                       ││
│  │                                              ││
│  │ ✏️ À faire pour Jeudi 06/03:                 ││
│  │ Exercices 1 à 5 page 124                    ││
│  │ [📤 Rendre en ligne]                        ││
│  └──────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────┐│
│  │ 📗 Français                                  ││
│  │ Contenu: La Fontaine — Le Corbeau et le...  ││
│  │ 📎 texte_fontaine.pdf                        ││
│  │                                              ││
│  │ ✏️ À faire pour Lundi 10/03:                 ││
│  │ Rédaction: fable moderne (300 mots)         ││
│  │ [📤 Rendre en ligne]                        ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  📅 Mardi 04/03                                  │
│  └── ...                                         │
└──────────────────────────────────────────────────┘
```

---

## Module 5: Assignments & Submissions

### Data Model
```
Submission
├── id (uuid)
├── homework_id (fk)
├── student_id (fk → User)
├── submitted_at (timestamp)
├── content (text, nullable) — text submission
├── attachments (fk[] → File) — file submissions
├── status (enum: submitted | late | graded | returned)
├── grade (decimal, nullable)
├── teacher_feedback (rich text, nullable)
├── feedback_attachments (fk[] → File)
├── graded_at (nullable)
├── created_at
└── updated_at
```

### Features
- Students upload files or write text
- Late submission flagging (after due date)
- Teacher per-student correction with feedback
- Return with comments/annotations
- Batch download all submissions
- Status tracking (submitted → graded → returned)

---

## Module 6: QCM / Quizzes

### Data Model
```
Quiz
├── id (uuid)
├── tenant_id (fk)
├── subject_id (fk)
├── teacher_id (fk)
├── title
├── description
├── time_limit_minutes (nullable)
├── max_attempts (int, default 1)
├── shuffle_questions (bool)
├── shuffle_answers (bool)
├── show_results_after (enum: immediately | after_deadline | manual)
├── available_from (timestamp)
├── available_until (timestamp)
├── is_published (bool)
├── shared_to_library (bool) — national shared library
├── tags (text[])
├── created_at
└── updated_at

Question
├── id (uuid)
├── quiz_id (fk)
├── type (enum: multiple_choice | single_choice | true_false | short_answer | fill_blank)
├── text (rich text)
├── image_id (fk → File, nullable)
├── points (decimal)
├── order (int)
├── explanation (rich text) — shown after grading
├── created_at
└── updated_at

Answer
├── id (uuid)
├── question_id (fk)
├── text
├── is_correct (bool)
├── order (int)

QuizAttempt
├── id (uuid)
├── quiz_id (fk)
├── student_id (fk → User)
├── started_at
├── completed_at (nullable)
├── score (decimal, nullable)
├── max_score (decimal)
├── answers (jsonb) — [{question_id, answer_id[], text_answer}]
├── created_at
```

### Question Bank Model
```
QuestionBank
├── id (uuid)
├── tenant_id (fk)
├── subject_id (fk)
├── created_by (fk → User) — teacher who created
├── name (e.g. "Algèbre 6ème")
├── scope (enum: personal | school | shared_library)
├── tags (text[]) — e.g. ["algèbre", "6ème", "equations"]
├── question_count (int, cached)
├── created_at
└── updated_at

QuestionBankEntry
├── id (uuid)
├── bank_id (fk → QuestionBank)
├── question_id (fk → Question) — references Question from quiz model
├── added_at
```

### Shared Library Mechanism

| Scope | Visibility | Who can contribute |
|-------|-----------|-------------------|
| `personal` | Only the creating teacher | Creator only |
| `school` | All teachers in the same tenant + subject | Any teacher with same subject |
| `shared_library` | All tenants that opted in | Read: anyone. Write: moderated |

**Opt-in flow:**
1. Admin enables shared library in tenant settings (`settings.enable_shared_library: true`)
2. Teacher marks a question bank as `scope: shared_library`
3. Questions are copied (not referenced) into the shared pool — no cross-tenant FK
4. Other teachers can browse shared library, filter by subject/tag, and import questions into their own banks
5. Importing copies the question into the teacher's personal bank — no live link

**Moderation:** Shared library questions go through `status: pending → approved → published`. Initially, the EduCore team moderates. Later, community voting.

### Features
- Create quizzes with mixed question types
- Question bank per subject (reuse across quizzes)
- Import from shared library (opt-in per school)
- Auto-grading for objective questions
- Manual grading for short answers
- Time limits, attempt limits
- Results: per student, per question analytics
- Link quiz to cahier de textes or assessment

---

## Module 6b: Study Hall (Permanence / Étude)

### Data Model
```
StudyHall
├── id (uuid)
├── tenant_id (fk)
├── campus_id (fk)
├── room_id (fk, nullable)
├── supervisor_id (fk → User) — vie scolaire staff or teacher
├── day_of_week (int: 0-6)
├── start_time (time)
├── end_time (time)
├── capacity (int, nullable)
├── academic_year_id (fk)
├── created_at
└── updated_at

StudyHallAttendance
├── id (uuid)
├── study_hall_id (fk)
├── student_id (fk → User)
├── date (date)
├── status (enum: present | absent | sent_by_teacher)
├── reason (text, nullable) — e.g. "class cancelled", "free period"
├── checked_in_at (timestamp, nullable)
├── created_at
```

### Features
- Study halls appear in timetable as "Permanence" blocks (auto-generated for free periods)
- Vie scolaire staff takes roll call (same UI as class attendance, simpler)
- Students assigned to study hall when their class is cancelled (via SessionException)
- Auto-assignment: when a session is cancelled, affected students are proposed for the matching study hall slot
- Capacity tracking (study room has limited seats)
- Not graded — attendance only

### How it differs from class attendance
- Managed by vie scolaire, not teachers
- No link to a Subject
- Students may come from different classes in the same slot
- Simpler UI: just check present/absent, no "late with justification" workflow

---

## Module 7: School Life (Vie scolaire)

### Data Model
```
Incident
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk → User)
├── reported_by (fk → User)
├── date (date)
├── type (enum: behavior | discipline | positive | other)
├── severity (enum: minor | moderate | major)
├── description (text)
├── action_taken (text, nullable)
├── follow_up_date (date, nullable)
├── status (enum: open | resolved | escalated)
├── parent_notified (bool)
├── attachments (fk[] → File)
├── created_at
└── updated_at

Sanction
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk → User)
├── incident_id (fk, nullable)
├── type (enum: warning | detention | exclusion | other)
├── description
├── date (date)
├── duration (text, nullable) — e.g. "2 hours", "3 days"
├── issued_by (fk → User)
├── parent_notified (bool)
├── created_at
└── updated_at

ExitAuthorization
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk → User)
├── type (enum: early_exit | permanent_exit_authorization)
├── authorized_by (fk → User) — parent
├── valid_from (date)
├── valid_until (date, nullable)
├── notes
├── created_at
└── updated_at
```

### Features
- Absence overview + justify workflow
- Incident/discipline reporting
- Sanctions management (warning, detention, exclusion)
- Exit authorizations from parents
- Parent visibility of all school life events
- Summary stats (absences this term, sanctions count)

---

## Module 8: Enrollment & Registration

### Data Model
```
EnrollmentForm
├── id (uuid)
├── tenant_id (fk)
├── academic_year_id (fk)
├── type (enum: inscription | reinscription)
├── title
├── fields (jsonb) — dynamic form definition
├── required_documents (text[])
├── status (enum: draft | open | closed)
├── opens_at (timestamp)
├── closes_at (timestamp)
├── created_at
└── updated_at

EnrollmentSubmission
├── id (uuid)
├── form_id (fk)
├── parent_id (fk → User)
├── student_id (fk → User)
├── data (jsonb) — form field values
├── documents (fk[] → File)
├── e_signature (bool)
├── payment_method (enum: card | transfer | check | cash)
├── status (enum: submitted | under_review | accepted | rejected | waitlisted)
├── reviewed_by (fk, nullable)
├── reviewed_at (nullable)
├── notes (text, nullable)
├── created_at
└── updated_at
```

### Features
- Customizable enrollment forms (admin builder)
- Required document checklist with online upload
- E-signature for authorization forms
- Payment method selection
- Review workflow (submitted → under review → accepted/rejected)
- Parent fills everything online ("zero paper" goal)
- Store in student/family record

---

## Module 9: Billing & Payments

### Data Model
```
Invoice
├── id (uuid)
├── tenant_id (fk)
├── number (sequential, e.g. "INV-2026-0001")
├── parent_id (fk → User)
├── student_id (fk → User)
├── items (jsonb) — [{description, quantity, unit_price, total}]
├── subtotal (decimal)
├── tax (decimal)
├── total (decimal)
├── status (enum: draft | sent | paid | overdue | cancelled | refunded)
├── due_date (date)
├── paid_at (nullable)
├── payment_method (enum: card | transfer | check | cash)
├── payment_reference (nullable)
├── notes (text, nullable)
├── created_at
└── updated_at

Payment
├── id (uuid)
├── invoice_id (fk)
├── amount (decimal)
├── method (enum: card | transfer | check | cash)
├── reference (text) — transaction ID
├── status (enum: pending | completed | failed | refunded)
├── processed_at
├── created_at
```

### Features
- Invoice generation (manual or auto from enrollment)
- Online payment (Stripe integration)
- Payment tracking and receipts (PDF)
- Overdue reminders (automated email)
- Parent can view and pay from portal
- Export for accounting
- Partial payments support

---

## Module 10: Cloud & Document Storage

### Features
- Personal cloud per user (2-5 GB configurable)
- Teacher locker (students can deposit work)
- Shared workspaces for collaborative documents
- Folder structure, upload, download, search
- File preview (PDF, images)
- Streaming video option (upload → playback link)

---

## Module 11: Calendar & Events

### Data Model
```
CalendarEvent
├── id (uuid)
├── tenant_id (fk)
├── title
├── description
├── type (enum: holiday | exam_period | meeting | event | deadline)
├── start_date (date or datetime)
├── end_date (date or datetime)
├── all_day (bool)
├── target_audience (enum: all | staff | students | parents | group)
├── target_group_id (fk, nullable)
├── recurrence_rule (text, nullable) — RRULE for recurring events
├── location (text, nullable)
├── created_by (fk)
├── created_at
└── updated_at
```

### Features
- School-wide calendar (holidays, events, exam periods)
- Class-specific events
- Parent-teacher meeting scheduling
- Integration with timetable
- Export to iCal

---

## Module 12: Report Cards (Bulletins)

### Data Model
```
ReportCard
├── id (uuid)
├── tenant_id (fk)
├── student_id (fk)
├── term_id (fk)
├── academic_year_id (fk)
├── group_id (fk)
├── general_average (decimal)
├── class_average (decimal)
├── rank (int, nullable)
├── council_comment (text, nullable) — conseil de classe
├── principal_comment (text, nullable)
├── status (enum: draft | approved | published)
├── published_at (nullable)
├── created_at
└── updated_at

ReportCardSubject
├── id (uuid)
├── report_card_id (fk)
├── subject_id (fk)
├── teacher_id (fk)
├── average (decimal)
├── class_average (decimal)
├── min_grade (decimal)
├── max_grade (decimal)
├── coefficient (decimal)
├── teacher_comment (text)
├── created_at
```

### Features
- Auto-generated from gradebook data
- Teacher adds per-subject comments
- Council comment (conseil de classe)
- Principal comment
- Approval workflow (draft → approved → published to parents)
- PDF export — custom template inspired by Pronote bulletin format (no official mandatory format for private schools). Includes: school-branded header, per-subject table (average, class avg, min, max, coefficient, teacher comment), general average + rank, council comment, principal comment
- Historical report cards accessible
- Comparison across terms

---

## Acceptance Criteria Summary

| Feature | Criteria |
|---------|----------|
| Timetable | Student sees correct weekly schedule within 2 seconds |
| Attendance | Teacher completes roll call for 30 students in < 60 seconds |
| Gradebook | Averages recalculate within 1 second of grade entry |
| Homework | Student sees all upcoming homework sorted by due date |
| QCM | Auto-graded quiz returns score immediately on completion |
| Vie scolaire | Parent notified of absence within 5 minutes |
| Enrollment | Parent completes full enrollment form online without paper |
| Billing | Parent pays invoice online with card in < 3 clicks |
| Report cards | PDF export matches standard French bulletin format |
| Messaging | Message delivered and notification sent within 30 seconds |
