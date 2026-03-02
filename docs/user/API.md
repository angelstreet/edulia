# Edulia API Reference

Base URL: `https://edulia.angelstreet.io/api/v1`

## Authentication

### Login
```
POST /auth/login
Body: { "email": "...", "password": "..." }
Response: { "access_token": "...", "user": { "id", "email", "role", "tenant_id" } }
```

All other endpoints require `Authorization: Bearer <token>` header.

## Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dashboard/stats | Role-specific dashboard stats |

## Timetable
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /timetable/sessions | List sessions (filterable by group, teacher, room) |
| POST | /timetable/sessions | Create a session |
| POST | /timetable/check-conflicts | Check for scheduling conflicts |

## Gradebook
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /gradebook/assessments | List assessments |
| POST | /gradebook/assessments | Create an assessment |
| POST | /gradebook/grades | Enter grades |
| GET | /gradebook/student-grades | Student's grades grouped by subject |

## Report Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /report-cards/students/{id}/pdf | Download PDF report card |

## Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /threads | List message threads |
| POST | /threads | Create a new thread |
| GET | /threads/{id} | Thread detail with messages (includes sender_name) |
| POST | /threads/{id}/messages | Reply to a thread |
| PATCH | /threads/{id}/read | Mark thread as read |

## Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /attendance | List attendance records |
| POST | /attendance | Record attendance |

## Homework
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /homework | List homework assignments |
| POST | /homework | Create homework |

## Catalog (EduliaHub)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /catalog/courses | List courses (search, filter) |
| GET | /catalog/courses/{id} | Course detail |
| GET | /catalog/platforms | List learning platforms |
| POST | /catalog/courses/{id}/subscribe | Subscribe to a course |
| DELETE | /catalog/courses/{id}/subscribe | Unsubscribe |
| GET | /catalog/my-courses | My subscribed courses |
| POST | /catalog/courses/{id}/rate | Rate a course (1-5) |
| GET | /catalog/courses/{id}/ratings | Get course ratings |

## Portfolio
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /portfolio | My portfolio |
| GET | /portfolio/public/{slug} | Public portfolio (no auth) |

## Interactive Docs
Full OpenAPI spec available at: `https://edulia.angelstreet.io/api/docs`
