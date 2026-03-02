# Edulia — Education Management Platform

Edulia is a multi-tenant education management platform serving **3 audiences**:
- **Schools** (Ecole Moliere) — full academic management
- **Tutoring centers** (TutorPro) — session scheduling & student tracking
- **Enterprise training** (FormaTech) — corporate L&D management

Plus **EduliaHub** — a course catalog marketplace connecting all three.

## Quick Links

| What | URL |
|------|-----|
| School/Tutor/Enterprise app | https://edulia.angelstreet.io |
| EduliaHub marketplace | https://eduliahub.angelstreet.io |
| GitHub repo | https://github.com/angelstreet/edulia |

## Demo Accounts

Login at https://edulia.angelstreet.io with password `demo2026`:

| Role | Email | Organization |
|------|-------|-------------|
| Admin | admin@demo.edulia.io | Ecole Moliere |
| Teacher (Maths) | prof.martin@demo.edulia.io | Ecole Moliere |
| Teacher (French) | prof.dubois@demo.edulia.io | Ecole Moliere |
| Student | emma.leroy@demo.edulia.io | Ecole Moliere |
| Student | lucas.moreau@demo.edulia.io | Ecole Moliere |
| Parent | parent.leroy@demo.edulia.io | Ecole Moliere |
| Tutor | sophie@demo.edulia.io | TutorPro Lyon |
| Tutor Student | julie.petit@demo.edulia.io | TutorPro Lyon |
| Enterprise HR | rh@demo.edulia.io | FormaTech SA |
| Employee | marie.lefevre@demo.edulia.io | FormaTech SA |

## What Each Role Can Do

### Admin
- View dashboard with school-wide stats (student/teacher/parent/class counts)
- Manage timetable across all classes
- Track attendance for all students
- Access all messages and announcements
- View homework assignments across classes

### Teacher
- Dashboard with personal stats (classes, students, today's sessions)
- Gradebook: create assessments, enter grades per class
- Timetable: view personal weekly schedule
- Messages: communicate with parents, students, and admin
- Homework: assign and track submissions

### Student
- Dashboard with personal stats and upcoming events
- Grades: view all subjects with detailed per-assessment breakdown
- Timetable: personal weekly schedule
- Messages: receive announcements, message teachers
- Homework: view assignments and deadlines

### Parent
- Dashboard with children's overview
- Grades: select child, view their grades per subject with assessment details
- Messages: communicate with teachers about children's progress
- Attendance: view children's attendance records

### Tutor
- Dashboard with session and student overview
- Gradebook: assessments for tutoring groups
- Timetable: weekly tutoring session schedule
- Messages: communicate with students and parents

### Enterprise HR Admin
- Dashboard with employee training overview
- Messages: announcements and direct communication with employees

### Enterprise Employee
- Dashboard with personal training status
- Messages: receive training announcements, communicate with HR

## EduliaHub Features

### Course Catalog
- Browse 31 courses across 15 learning platforms (Coursera, Udemy, OpenClassrooms, etc.)
- Filter by category, platform, difficulty, language
- View course details: description, duration, price, rating

### User Features (after signup)
- Subscribe/bookmark courses for tracking
- Rate and review courses (1-5 stars)
- Earn certificates
- Build a public portfolio of certifications

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐
│  Frontend    │────▶│  Backend    │────▶│  PostgreSQL   │
│  React/Vite  │     │  FastAPI    │     │  Database     │
│  Port 3000   │     │  Port 8000  │     │  Port 5432    │
└─────────────┘     └─────────────┘     └───────────────┘
                          │
┌─────────────┐     ┌─────┴───────┐     ┌───────────────┐
│  EduliaHub  │     │  Socket.IO  │     │  Redis+MinIO  │
│  Port 3001  │     │  Real-time  │     │  Cache+Files  │
└─────────────┘     └─────────────┘     └───────────────┘
```

- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI + SQLAlchemy 2 + Alembic migrations
- **Database:** PostgreSQL 16 on dedicated VM
- **Real-time:** Socket.IO for live notifications
- **Storage:** MinIO (S3-compatible) for file uploads
- **Cache:** Redis for session management

## Multi-tenancy

Each organization (school, tutoring center, enterprise) is a **tenant**. Data is strictly isolated:
- Users can only see data from their own tenant
- API enforces tenant boundaries at the database query level
- Cross-tenant access is impossible by design

## Key Modules

| Module | Description |
|--------|------------|
| Dashboard | Role-specific home with stats and quick actions |
| Timetable | Weekly schedule with teacher/room/group views, conflict detection |
| Attendance | Daily attendance tracking with present/absent/late/excused |
| Gradebook | Assessments, grades, weighted averages, report card PDF export |
| Homework | Assignment creation, tracking, submission management |
| Messaging | Threads, announcements, direct messages with sender names |
| Report Cards | PDF bulletin generation with per-subject averages and appreciation |
| Catalog (Hub) | Course marketplace with ratings, subscriptions, certificates |
| Portfolio (Hub) | Public certification portfolio with shareable link |

