# Edulia Testing Guide

## Test Coverage

### API Tests (pytest)
Location: `apps/api/app/tests/`

| Test File | Module | Tests |
|-----------|--------|-------|
| test_auth.py | Authentication | Login, token validation, password hashing |
| test_users.py | User CRUD | Create, read, update, delete users |
| test_tenant.py | Multi-tenancy | Tenant isolation, data separation |
| test_rbac.py | Permissions | Role-based access control per endpoint |
| test_groups.py | Classes/Groups | Group CRUD, membership |
| test_subjects.py | Subjects | Subject CRUD |
| test_academic_years.py | Academic Years | Year/term management |
| test_messaging.py | Messages | Thread CRUD, replies, read receipts |
| test_notifications.py | Notifications | Push notifications, unread counts |
| test_relationships.py | Relations | Student-parent, teacher-class links |
| test_files.py | File Upload | MinIO upload/download |
| test_dashboard.py | Dashboard | Role-specific stats |
| test_gradebook.py | Grades | Assessments, grades, student view |
| test_timetable.py | Timetable | Sessions, conflict detection |
| test_report_cards.py | Report Cards | PDF generation |
| test_catalog.py | EduliaHub | Courses, ratings, subscriptions |
| test_homework.py | Homework | Assignment CRUD |
| test_attendance.py | Attendance | Attendance records |

### Running API Tests
```bash
ssh edulia-app
cd /opt/edulia/backend
source .venv/bin/activate
pytest apps/api/app/tests/ -v
```

### E2E Tests (Playwright)
Location: `apps/web/tests/`

| Test File | Coverage |
|-----------|----------|
| auth.spec.ts | Login flow, demo accounts, redirect after login |
| dashboard.spec.ts | Role-specific dashboard rendering |
| navigation.spec.ts | Sidebar navigation, role-based menu items |
| grades.spec.ts | Student grades view, subject expansion, PDF download, parent child selector |
| messages.spec.ts | Thread list, message bubbles, sender names |
| timetable.spec.ts | Schedule grid, student/admin views |
| hub.spec.ts | Course catalog, platforms, course detail |

### Running E2E Tests
```bash
cd apps/web
npx playwright test
# Or specific file:
npx playwright test tests/grades.spec.ts
```

### Test Architecture
- **API tests** use pytest with fixtures for auth tokens and test data
- **E2E tests** use Playwright with login helpers for each role
- **Seed data** provides consistent test fixtures (`scripts/seed_demo.py`)

### What's NOT Tested Yet
- File upload/download E2E
- Real-time notifications (Socket.IO)
- Concurrent multi-tenant operations
- Performance/load testing
- Mobile viewport E2E
