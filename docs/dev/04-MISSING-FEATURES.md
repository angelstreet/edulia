# 04 — Missing Features (Ecole Directe Gap Analysis)

Features identified from Ecole Directe parent portal that are not covered by our current module catalog.

## 1. Forms & Surveys Module (`forms`)

**What Ecole Directe has:** "Formulaires et sondages" — school sends forms to parents for consent, surveys, event sign-ups, information collection.

**What we need to build:**

### Backend

| Component | Details |
|---|---|
| Models | `Form` (title, description, type: survey/consent/info, status: draft/published/closed, target_roles, deadline) |
| | `FormField` (form_id, label, field_type: text/textarea/checkbox/radio/select/date/file, required, options JSON, position) |
| | `FormResponse` (form_id, user_id, submitted_at, data JSON) |
| Router | `POST /api/forms` — create form (admin/teacher) |
| | `GET /api/forms` — list forms (filtered by role, status) |
| | `GET /api/forms/{id}` — get form with fields |
| | `POST /api/forms/{id}/responses` — submit response (parent/student) |
| | `GET /api/forms/{id}/responses` — view responses (admin) |
| | `GET /api/forms/{id}/stats` — aggregated results for surveys |
| Service | Form builder logic, response validation, deadline enforcement |
| | CSV/Excel export of responses |
| | Notification trigger on publish (→ messaging module) |

### Frontend

| Page | Details |
|---|---|
| Form Builder | Drag-and-drop field editor, preview, publish workflow |
| Form List | Admin: all forms with response counts. Parent/student: pending forms |
| Form Fill | Render form dynamically from field definitions, validate, submit |
| Form Results | Admin: table of responses, charts for survey questions, export button |

### Dependencies
- `messaging` (notifications on publish)
- `files` (file upload fields)

### Estimated effort: Medium

---

## 2. Document Categories (Enhancement to `files` core module)

**What Ecole Directe has:** Documents split into tabs: Administratif, Vie Scolaire, Notes, Factures. Each category auto-populated from relevant modules.

**What we have:** Flat file storage with upload/download. No categories, no auto-linking to modules.

**What we need to build:**

### Backend

| Component | Details |
|---|---|
| Model changes | Add `category` enum to `File`: `general`, `administrative`, `school_life`, `grades`, `invoices`, `enrollment` |
| | Add `source_module` field: which module generated this document (nullable for manual uploads) |
| | Add `visibility` field: `public` (all users), `role_based` (specific roles), `private` (owner + admin) |
| Auto-generation | Report cards → auto-saved as `grades` category |
| | Invoices → auto-saved as `invoices` category |
| | Enrollment docs → auto-saved as `enrollment` category |
| | Attendance reports → auto-saved as `school_life` category |
| Router changes | `GET /api/files?category=grades` — filter by category |
| | `GET /api/files/categories` — list categories with counts |

### Frontend

| Page | Details |
|---|---|
| Documents page | Tabbed view by category (like Ecole Directe) instead of flat list |
| Per-document | Badge showing source module, download, preview |
| Admin | Bulk categorize, manage visibility |

### Dependencies
- Existing `files` module (enhancement, not new module)
- Benefits from `gradebook`, `billing`, `attendance`, `enrollment` auto-populating

### Estimated effort: Small-Medium

---

## 3. Wallet / Porte-Monnaie (Enhancement to `billing` module)

**What Ecole Directe has:** Prepaid wallet system per family. Services (cantine, garderie, etude dirigee, sortie scolaire) are items in a cart. Parents top up their wallet, then pay for services from the balance. Separate from tuition invoices.

**What we have:** `billing` module spec covers invoices and Stripe payments. No wallet/credit concept, no service catalog.

**What we need to build:**

### Backend

| Component | Details |
|---|---|
| Models | `Wallet` (user_id, balance_cents, currency, last_topped_up) |
| | `WalletTransaction` (wallet_id, amount_cents, type: topup/debit/refund, description, reference_type, reference_id, created_at) |
| | `ServiceCatalog` (tenant_id, name: "Cantine midi", category: cantine/garderie/etude/sortie, unit_price_cents, billing_period: daily/weekly/monthly/per_event, active) |
| | `ServiceSubscription` (student_id, service_id, start_date, end_date, days_of_week JSON, status) |
| | `Cart` / `CartItem` — transient, for checkout flow |
| Router | `GET /api/wallet` — current balance + recent transactions |
| | `POST /api/wallet/topup` — Stripe checkout for top-up |
| | `GET /api/services` — available services for tenant |
| | `POST /api/services/subscribe` — subscribe student to service |
| | `POST /api/cart/checkout` — debit wallet for cart items |
| | `GET /api/wallet/transactions` — full history with filters |
| Service | Auto-debit for recurring services (daily cantine charge) |
| | Low balance alerts (→ notification) |
| | Monthly statement generation |
| | Refund processing |

### Frontend

| Page | Details |
|---|---|
| Wallet page | Balance display, top-up button, transaction history |
| Service catalog | Browse available services, subscribe per child |
| Cart & checkout | Add services to cart, pay from wallet or direct Stripe |
| Situation financiere | Overview: wallet balance + pending invoices + payment history (matches Ecole Directe) |

### Dependencies
- `billing` (extends it, not separate)
- Stripe integration for top-ups

### Estimated effort: Large

---

## 4. Community / Contacts (`community`)

**What Ecole Directe has:** "Communaute" sidebar item — appears to be a directory of school contacts (teachers, staff, parent delegates) and possibly a parent association space.

**What we need to build:**

### Backend

| Component | Details |
|---|---|
| Models | Uses existing `User` + `Group` models |
| | Add `ContactVisibility` settings per tenant (who can see whom) |
| | `ParentDelegate` (group_id, user_id, role: delegate/substitute, year) |
| Router | `GET /api/community/directory` — filtered user directory (teachers by subject, parents by class) |
| | `GET /api/community/delegates` — parent delegates per class |
| | Privacy controls: only show name + role, no personal contact unless opted-in |

### Frontend

| Page | Details |
|---|---|
| Directory | Searchable list of school staff, organized by role/department |
| Class contacts | Per-class view: teacher, parent delegates |
| Privacy settings | User opt-in for showing email/phone to other parents |

### Dependencies
- `users`, `groups` (core, already built)

### Estimated effort: Small

---

## Summary

| Feature | Type | Effort | Priority | Blocks school MVP? |
|---|---|---|---|---|
| Forms & Surveys | New module | Medium | P2 | No (nice-to-have for pilot) |
| Document Categories | Enhancement | Small-Medium | P2 | No (but improves UX significantly) |
| Wallet / Porte-Monnaie | Enhancement | Large | P2 | No (tuition invoicing sufficient for MVP) |
| Community / Contacts | New module | Small | P3 | No |

**None of these block the school MVP** (timetable + attendance + gradebook + homework). They're P2/P3 features that round out the Ecole Directe parity story.

### Recommended build order (after Priority 1 modules):
1. Document Categories — small effort, immediate UX win
2. Forms & Surveys — parents expect this
3. Wallet — complex but differentiating
4. Community — low effort, can slot in anytime
