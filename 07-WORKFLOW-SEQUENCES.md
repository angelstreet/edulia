# 07 — Workflow Sequences

Step-by-step flows for every key operation. Each workflow shows: actor, trigger, steps, side effects (notifications, audit).

---

## CORE WORKFLOWS

### W1: User Login
```
Actor: Any user
Trigger: Open app / navigate to login

1. User opens app → LoginPage
2. Enter email + password → click "Se connecter"
3. API: POST /auth/login
4. Backend validates credentials → returns JWT (access + refresh)
5. Frontend stores tokens → redirects to Dashboard
6. Dashboard loads role-specific widgets

Alt: SSO
2b. Click "Se connecter avec Microsoft"
3b. Redirect to Entra ID → OIDC flow → callback with code
4b. Backend exchanges code → creates/links user → returns JWT
```

### W2: User Invite (Admin)
```
Actor: Admin
Trigger: Admin creates new user

1. Admin → Users page → [+ Ajouter]
2. Fill: name, email, role(s), group(s)
3. API: POST /users (status: "invited")
4. Backend creates user record + generates invite token
5. Email sent with invite link
6. New user clicks link → AcceptInvitePage
7. Sets password → API: POST /auth/invite/accept
8. User activated (status: "active")

Side effects:
- Audit log: "user.invite" by admin
- Audit log: "user.activate" by invited user
```

### W3: Send Message
```
Actor: Any user
Trigger: Click "Nouveau message"

1. Open ComposeMessage
2. Select recipients (search by name/role/class)
3. Write subject + body + optional attachments
4. API: POST /threads (creates thread + first message)
5. Backend creates Thread + ThreadParticipants + Message
6. Notification dispatched to all recipients (in-app + email digest)
7. Recipients see unread indicator on Messages sidebar

Side effects:
- Notification: "Nouveau message de [sender]"
- Email: sent if recipient has email notifications enabled
```

---

## SCHOOL WORKFLOWS

### W4: Teacher Takes Roll Call
```
Actor: Teacher
Trigger: Click session in timetable OR "Appel" button

1. Teacher opens timetable → clicks current session
2. RollCallPage loads: list of all students in group
3. Default: all marked "Present"
4. Teacher toggles Absent/Late for specific students
5. For Late: enter minutes (optional)
6. Click [Enregistrer l'appel]
7. API: POST /attendance/bulk (array of records)
8. Backend saves AttendanceRecord per student

Side effects:
- For each Absent/Late student:
  → Notification to parent: "Votre enfant [name] est absent/en retard"
  → Email to parent (if enabled)
- Audit log: "attendance.create" by teacher
- Vie scolaire dashboard updated in real-time
```

### W5: Parent Justifies Absence
```
Actor: Parent
Trigger: Notification about child's absence

1. Parent receives notification → clicks link
2. Opens Vie scolaire page for child
3. Sees unjustified absence → clicks [Justifier]
4. AbsenceJustifyForm opens:
   - Select reason (dropdown: doctor, family, transport, other)
   - Write comment
   - Upload justification document (optional)
5. Submit → API: PATCH /attendance/{id}/justify
6. Backend updates: justified=true, reason, document
7. Vie scolaire staff sees justification in their queue

Side effects:
- Notification to vie scolaire: "Justificatif reçu pour [student]"
- Audit log: "attendance.justify" by parent
```

### W6: Teacher Enters Grades
```
Actor: Teacher
Trigger: After an assessment (test, homework, etc.)

1. Teacher → Gradebook → select class + subject
2. Click [+ Nouvelle évaluation]
3. Fill: title, date, max score, coefficient, category
4. API: POST /assessments → creates Assessment
5. GradeGrid appears: list of students with empty score fields
6. Teacher enters score per student + optional comment
7. Click [Enregistrer] → API: POST /grades/bulk
8. Backend saves Grade records, recalculates averages
9. Optional: click [Publier] → marks assessment as published

Side effects on publish:
- Each student: notification "Nouvelle note en [subject]: [score]/[max]"
- Each parent: notification "Nouvelle note pour [child]"
- Averages recalculated (subject, term, general)
- Audit log: "grade.create" + "assessment.publish" by teacher
```

### W7: Student Views Grades
```
Actor: Student
Trigger: Notification or navigation to Grades

1. Student → Mes notes
2. Page loads: API: GET /grades/me?term_id=X
3. Grouped by subject, sorted by date (newest first)
4. Each grade shows: title, score, coefficient, date, comment
5. Subject average, class average, min, max displayed
6. General average at bottom
7. Optional: click grade → detail view with teacher comment
```

### W8: Teacher Fills Cahier de Textes
```
Actor: Teacher
Trigger: After (or before) a class session

1. Teacher → Timetable → click session (or Cahier de textes page)
2. SessionContentForm opens, pre-filled with class/subject/date
3. Fill "Contenu de la séance" (rich text)
4. Attach files (PDFs, links)
5. Fill "Travail à faire" section:
   - Description of homework
   - Due date (select from upcoming sessions)
   - Toggle: allow online submission? yes/no
   - Attach exercise files
6. Save → API: POST /session-content + POST /homework
7. Students see content in Cahier de textes immediately

Side effects:
- If homework created: students see it in "Travail à faire"
- No notification by default (cahier update is routine)
```

### W9: Student Submits Homework
```
Actor: Student
Trigger: Homework with online submission enabled

1. Student → Devoirs → sees homework with [Rendre en ligne]
2. Click → SubmissionForm opens
3. Upload file(s) and/or write text response
4. Submit → API: POST /submissions
5. Backend creates Submission (status: "submitted")
6. If after due date: automatically flagged as "late"
7. Student sees confirmation: "Devoir rendu ✓"

Side effects:
- Teacher: notification "Nouveau rendu: [student] — [homework title]"
- Audit log: "submission.create"
```

### W10: Teacher Reviews Submission
```
Actor: Teacher
Trigger: Notification or checking submissions list

1. Teacher → Homework → select homework → Rendus
2. List of submissions: student, date, status, files
3. Click student → view submission content/files
4. Write feedback (rich text) + optional grade
5. Attach corrected file (optional)
6. Click [Retourner] → API: PATCH /submissions/{id}
7. Status: "graded" or "returned"

Side effects:
- Student: notification "Correction disponible: [homework]"
- Parent: notification if enabled
- Grade optionally linked to gradebook assessment
```

### W11: Report Card Generation
```
Actor: Admin / Teacher / System
Trigger: End of term

1. Admin → Report Cards → select term + class
2. System pre-fills from gradebook:
   - Per-subject averages, class averages, min, max
   - General average, rank (if enabled)
3. Teachers add per-subject comments (can be done earlier)
4. Council comment added (by form teacher or admin)
5. Principal comment added
6. Admin reviews → clicks [Approuver]
7. Admin clicks [Publier] → parents/students can see
8. PDF generated per student

Side effects:
- Parent: notification "Bulletin du [term] disponible"
- PDF stored in File system, linked to ReportCard
- Audit log: "report_card.publish"
```

### W12: Online Enrollment
```
Actor: Parent
Trigger: Enrollment period opens

1. Admin creates EnrollmentForm with fields + required documents
2. Admin publishes form (opens_at/closes_at)
3. Parents notified: "Inscriptions ouvertes"
4. Parent → Enrollment page → fills form:
   - Student info, desired track/class
   - Upload required documents (birth cert, photo, etc.)
   - Select payment method
   - E-sign authorization forms
5. Submit → API: POST /enrollment-submissions
6. Status: "submitted"
7. Admin reviews → accepts/rejects/waitlists
8. Parent notified of decision

Side effects:
- Admin dashboard: enrollment stats (submitted, reviewed, accepted)
- Audit log: "enrollment.submit", "enrollment.review"
```

### W13: Online Payment
```
Actor: Parent
Trigger: Invoice received

1. Admin creates invoice (or auto-generated from enrollment)
2. Parent notified: "Facture #X — €Y — échéance [date]"
3. Parent → Paiements → sees invoice
4. Click [Payer en ligne]
5. Redirect to Stripe checkout (or embedded form)
6. Payment processed → callback to backend
7. Invoice status: "paid", payment record created
8. Receipt PDF generated

Side effects:
- Parent: confirmation email with receipt
- Admin: billing dashboard updated
- Audit log: "payment.completed"
```

---

## TUTORING WORKFLOWS

### W14: Tutor Sets Availability
```
Actor: Tutor
Trigger: Initial setup or weekly update

1. Tutor → Calendar → [⚙ Disponibilités]
2. Set default weekly template:
   - For each day: toggle available, set start/end times
3. Save → API: PATCH /tutors/me/availability
4. Override specific dates:
   - Click date → mark unavailable or set custom hours
   - API: POST /availability-overrides

Result: Booking system now shows correct available slots
```

### W15: Book a Tutoring Session
```
Actor: Parent or Admin
Trigger: Need to schedule a session

1. Parent → Réserver → select student + tutor + subject
2. System shows available slots (week view)
   API: GET /tutoring/availability?tutor_id=X&week=Y
3. Parent selects a slot
4. Choose: individual/group, online/in-person
5. Choose recurrence: once or weekly
6. Confirm → API: POST /tutoring/sessions
7. Backend checks: slot available? package has hours? conflicts?
8. Session created (status: "scheduled")

Side effects:
- Tutor: notification "Nouvelle séance: [student] [date] [time]"
- Student: notification "Séance réservée: [subject] [date]"
- If recurring: all future sessions created up to package expiry
- Package hours reserved (not yet deducted)
```

### W16: Complete Tutoring Session
```
Actor: Tutor
Trigger: After session ends

1. Tutor → Calendar → click completed session
2. Mark status: "completed" (or "no_show")
3. Write session notes: what was covered, next steps
4. Link to learning plan entry (optional)
5. Rate progress: struggling / improving / on_track / exceeding
6. Save → API: PATCH /tutoring/sessions/{id}

Side effects:
- If completed: hours deducted from student's package
- If no_show: configurable (deduct or not, based on policy)
- Low balance alert if package < 2 hours remaining
- Parent: notification "Résumé de séance disponible"
- Learning plan entry created/updated
```

### W17: Cancel Tutoring Session
```
Actor: Parent, Tutor, or Admin
Trigger: Need to cancel

1. Navigate to session → click [Annuler]
2. Select reason (dropdown)
3. System checks cancellation policy:
   - If > 24h notice: hours credited back to package
   - If < 24h notice: hours NOT credited (configurable)
4. Confirm → API: PATCH /tutoring/sessions/{id} (status: "cancelled")

Side effects:
- Other party notified: "[person] a annulé la séance du [date]"
- Tutor calendar slot freed
- Package balance updated (or not, per policy)
- Audit log: "tutoring.cancel" with reason
```

### W18: Reschedule Session
```
Actor: Parent or Tutor
Trigger: Need to change time

1. Navigate to session → click [Reprogrammer]
2. System shows available alternative slots
3. Select new slot → confirm
4. API: PATCH /tutoring/sessions/{id} (new time)
5. Both parties notified

Side effects:
- Old slot freed, new slot reserved
- Notification: "Séance reprogrammée: [old] → [new]"
```

### W19: Package Purchase
```
Actor: Parent or Admin
Trigger: Student needs tutoring hours

1. Parent/Admin → Forfaits → browse available packages
2. Select package (e.g. "Pack 10h — €360")
3. Confirm → API: POST /student-packages
4. Payment flow (Stripe or manual)
5. Package activated (status: "active", hours_remaining: 10)

Side effects:
- Invoice auto-generated
- Parent: confirmation email
- Tutor: notification if assigned
```

### W20: Auto-Invoice Generation (Monthly)
```
Actor: System (scheduled job)
Trigger: 1st of each month (or configurable)

1. Worker job runs: generate_monthly_invoices
2. For each active student:
   - Collect completed sessions in period
   - Calculate total (hours × rate, or package prorated)
   - Create Invoice with line items per session
3. API: POST /invoices (bulk)
4. Send invoices via email

Side effects:
- Parent: email with invoice PDF attached
- Admin: billing dashboard updated
- Overdue invoices from previous month: reminder sent
```

---

## CROSS-CUTTING WORKFLOWS

### W21: Search
```
Actor: Any user
Trigger: Click search bar or Ctrl+K

1. Type query (min 2 chars)
2. API: GET /search?q=X (debounced 300ms)
3. Results grouped: Users, Classes, Messages, Files
4. Click result → navigate to detail page

Scoped by role:
- Teacher: sees own classes, students, messages
- Student: sees own grades, homework, messages
- Parent: sees children's data
- Admin: sees everything
```

### W22: Notification Lifecycle
```
Trigger: Any event that generates notifications

1. Service creates notification(s):
   - Determines recipients based on event type
   - Creates Notification records (channel: in_app)
2. In-app: pushed via polling or WebSocket
3. Email: queued as Celery job → sent via SMTP/provider
4. User sees badge count on 🔔
5. Click → NotificationPanel → list of notifications
6. Click notification → navigate to relevant page
7. Mark as read → API: PATCH /notifications/{id}/read
```

### W23: File Upload
```
Actor: Any user (where upload is allowed)
Trigger: Click upload in any context

1. FileUpload component opens
2. Select file(s) from device
3. Client-side validation: size limit, allowed types
4. API: POST /files/upload (multipart form data)
5. Backend: validate, store in S3/MinIO, create File record
6. Return file metadata (id, url, name, size)
7. File linked to context (message, submission, homework, etc.)
```

---

## Workflow Summary Table

| # | Workflow | Actor | Module | Priority |
|---|---------|-------|--------|----------|
| W1 | Login | Any | Core | 🔴 P0 |
| W2 | User Invite | Admin | Core | 🔴 P0 |
| W3 | Send Message | Any | Messaging | 🔴 P0 |
| W4 | Roll Call | Teacher | Attendance | 🔴 P0 |
| W5 | Justify Absence | Parent | Attendance | 🔴 P0 |
| W6 | Enter Grades | Teacher | Gradebook | 🔴 P0 |
| W7 | View Grades | Student | Gradebook | 🔴 P0 |
| W8 | Fill Cahier | Teacher | Homework | 🔴 P0 |
| W9 | Submit Homework | Student | Homework | 🟡 P1 |
| W10 | Review Submission | Teacher | Homework | 🟡 P1 |
| W11 | Report Card | Admin | Reports | 🟡 P1 |
| W12 | Enrollment | Parent | Enrollment | 🟡 P1 |
| W13 | Payment | Parent | Billing | 🟡 P1 |
| W14 | Set Availability | Tutor | Tutoring | 🔴 P0 |
| W15 | Book Session | Parent | Tutoring | 🔴 P0 |
| W16 | Complete Session | Tutor | Tutoring | 🔴 P0 |
| W17 | Cancel Session | Any | Tutoring | 🔴 P0 |
| W18 | Reschedule | Any | Tutoring | 🟡 P1 |
| W19 | Buy Package | Parent | Tutoring | 🟡 P1 |
| W20 | Auto-Invoice | System | Billing | 🟡 P1 |
| W21 | Search | Any | Core | 🟡 P1 |
| W22 | Notifications | System | Core | 🔴 P0 |
| W23 | File Upload | Any | Core | 🔴 P0 |
