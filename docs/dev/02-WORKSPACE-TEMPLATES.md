# 02 — Workspace Templates

A workspace template is a **preset** applied when creating a new tenant. It pre-configures: enabled modules, labels/vocabulary, default roles, and policies. After creation, the admin can toggle any module on/off — templates are just starting points.

## Template Comparison

| Config key | School | Tutoring | Enterprise |
|---|---|---|---|
| `enabled_modules` | timetable, attendance, gradebook, homework, report_cards, qcm, school_life, enrollment, billing, calendar, cloud | booking, learning_plans, packages, billing, calendar | timetable, gradebook, billing, calendar, cloud |
| **Labels** | | | |
| `teacher_label` | Enseignant | Tuteur | Formateur |
| `learner_label` | Élève | Apprenant | Apprenant |
| `supervisor_label` | Parent | Parent | Manager |
| `group_label` | Classe | Groupe | Cohorte |
| `session_label` | Cours | Séance | Session |
| **Policies** | | | |
| `grading_scale` | 20 | — (progress notes) | pass/fail |
| `grading_type` | numeric | qualitative | competency |
| `attendance_mode` | per_session | per_booking | per_module |
| `academic_structure` | trimester | — | — |
| `billing_model` | annual_tuition | hour_packages | budget_allocation |
| `cancellation_policy_hours` | — | 24 | — |
| **Roles** | | | |
| Default roles | admin, teacher, student, parent, vie_scolaire, accountant | admin, tutor, student, parent | admin, trainer, learner, manager |

## School Template

Target: K-12 private schools (alternative to École Directe / Pronote).

**What makes it "school":**
- Timetable with weekly recurring sessions, rooms, substitutions
- Formal attendance per session (present/absent/late + justifications)
- Numeric grading /20 with coefficients and averages
- Report cards (bulletins) with council comments
- Homework diary (cahier de textes)
- Vie scolaire (incidents, sanctions, study hall)
- Enrollment forms with e-signature
- Annual tuition billing

**Roles:**
| Role | Access |
|---|---|
| Admin | Everything |
| Teacher | Own classes, gradebook, attendance, homework, messaging |
| Student | Own grades, timetable, homework, submissions, messaging |
| Parent | Children's data, messaging, payments, documents |
| Vie scolaire | Attendance, incidents, sanctions |
| Accountant | Billing, payments, invoices |

## Tutoring Template

Target: Tutoring centers, independent tutors, coaching businesses.

**What makes it "tutoring":**
- Booking system (availability + slots instead of fixed timetable)
- Individual learning plans with goals and progress notes
- Hour packages / credit bundles
- Per-session billing (not annual)
- Simpler evaluation (progress ratings, not numeric grades)
- 1:1 or small group (1-5 students)

**Roles:**
| Role | Access |
|---|---|
| Center Admin | Everything |
| Tutor | Own students, calendar, materials, earnings |
| Student | Own sessions, homework, progress |
| Parent | Child's progress, payments, booking |

## Enterprise Template (Future)

Target: Corporate training departments, professional development.

**What makes it "enterprise":**
- Course catalog with learning paths
- Competency-based certification (not grades)
- Manager approval workflows
- Training budget allocation per team
- Compliance tracking

**Roles:**
| Role | Access |
|---|---|
| Admin | Everything |
| Trainer | Courses, assessments, participants |
| Learner | Own courses, certifications, progress |
| Manager | Team members' progress, budget, approvals |

## Creating a Custom Template

A template is just a JSON blob applied to `Tenant.settings` on creation. Any school can enable tutoring modules, any tutoring center can enable gradebook. The template is a starting point, not a constraint.

```json
{
  "type": "school",
  "settings": {
    "enabled_modules": ["timetable", "attendance", "gradebook", "homework", "billing"],
    "grading_scale": 20,
    "attendance_mode": "per_session",
    "academic_structure": "trimester",
    "locale": "fr",
    "timezone": "Europe/Paris",
    "labels": {
      "teacher": "Enseignant",
      "learner": "Élève",
      "supervisor": "Parent",
      "group": "Classe",
      "session": "Cours"
    }
  }
}
```
