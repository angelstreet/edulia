#!/usr/bin/env python3
"""Seed a minimal private tutor profile: 1 tutor, 1 student, 1 parent.

This creates the smallest possible tutoring tenant — a single teacher
working with one child, with the parent informed at each step.

Usage:
    python scripts/seed_private_tutor.py
    python scripts/seed_private_tutor.py --reset   # delete & recreate

Tenant slug: private-tutor-demo
Login password for all accounts: demo2026
"""
import argparse
import os
import sys
from datetime import date, time
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.db.models import (
    AcademicYear, Assessment, Campus, Grade,
    Group, GroupMembership, Message, Relationship,
    Role, Session, Subject, Term, Thread, ThreadParticipant,
    Tenant, User, UserRole,
)
from app.db.models.billing import SchoolInvoice

SLUG = "private-tutor-demo"
PASSWORD = hash_password("demo2026")


def delete_existing(db):
    from sqlalchemy import text
    from app.db.database import engine

    tenant = db.query(Tenant).filter(Tenant.slug == SLUG).first()
    if not tenant:
        return
    tid = str(tenant.id)
    db.close()  # release ORM session before raw ops

    # All tables that reference tenant_id, ordered children-before-parents.
    # Tables without tenant_id use subquery on a parent that has it.
    # Unknown/optional tables are safe to include — missing table just errors silently.
    steps = [
        # ── Indirect refs (no tenant_id, FK to tenant-bound parent) ──────────
        f"DELETE FROM grades WHERE assessment_id IN (SELECT id FROM assessments WHERE tenant_id = '{tid}')",
        f"DELETE FROM activity_attempts WHERE tenant_id = '{tid}'",
        f"DELETE FROM submissions WHERE homework_id IN (SELECT id FROM homework WHERE tenant_id = '{tid}')",
        f"DELETE FROM form_responses WHERE form_id IN (SELECT id FROM forms WHERE tenant_id = '{tid}')",
        f"DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE tenant_id = '{tid}')",
        f"DELETE FROM session_exceptions WHERE session_id IN (SELECT id FROM sessions WHERE tenant_id = '{tid}')",
        f"DELETE FROM group_memberships WHERE group_id IN (SELECT id FROM groups WHERE tenant_id = '{tid}')",
        f"DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE tenant_id = '{tid}')",
        f"DELETE FROM thread_participants WHERE thread_id IN (SELECT id FROM threads WHERE tenant_id = '{tid}')",
        f"DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE tenant_id = '{tid}')",
        # ── Direct tenant_id tables ──────────────────────────────────────────
        f"DELETE FROM grades WHERE assessment_id IN (SELECT id FROM assessments WHERE tenant_id = '{tid}')",
        f"DELETE FROM assessments WHERE tenant_id = '{tid}'",
        f"DELETE FROM grade_categories WHERE tenant_id = '{tid}'",
        f"DELETE FROM attendance_records WHERE tenant_id = '{tid}'",
        f"DELETE FROM absence_justifications WHERE tenant_id = '{tid}'",
        f"DELETE FROM incidents WHERE tenant_id = '{tid}'",
        f"DELETE FROM health_records WHERE tenant_id = '{tid}'",
        f"DELETE FROM homework WHERE tenant_id = '{tid}'",
        f"DELETE FROM activities WHERE tenant_id = '{tid}'",
        f"DELETE FROM live_sessions WHERE tenant_id = '{tid}'",
        f"DELETE FROM calendar_events WHERE tenant_id = '{tid}'",
        f"DELETE FROM notifications WHERE tenant_id = '{tid}'",
        f"DELETE FROM forms WHERE tenant_id = '{tid}'",
        f"DELETE FROM files WHERE tenant_id = '{tid}'",
        f"DELETE FROM enrollment_requests WHERE tenant_id = '{tid}'",
        f"DELETE FROM tutoring_invoices WHERE tenant_id = '{tid}'",
        f"DELETE FROM tutoring_sessions WHERE tenant_id = '{tid}'",
        f"DELETE FROM tutoring_packages WHERE tenant_id = '{tid}'",
        f"DELETE FROM service_subscriptions WHERE tenant_id = '{tid}'",
        f"DELETE FROM service_catalog WHERE tenant_id = '{tid}'",
        f"DELETE FROM wallets WHERE tenant_id = '{tid}'",
        f"DELETE FROM school_invoices WHERE tenant_id = '{tid}'",
        f"DELETE FROM threads WHERE tenant_id = '{tid}'",
        f"DELETE FROM sessions WHERE tenant_id = '{tid}'",
        f"DELETE FROM groups WHERE tenant_id = '{tid}'",
        f"DELETE FROM relationships WHERE tenant_id = '{tid}'",
        f"DELETE FROM users WHERE tenant_id = '{tid}'",
        f"DELETE FROM subjects WHERE tenant_id = '{tid}'",
        f"DELETE FROM terms WHERE academic_year_id IN (SELECT id FROM academic_years WHERE tenant_id = '{tid}')",
        f"DELETE FROM academic_years WHERE tenant_id = '{tid}'",
        f"DELETE FROM rooms WHERE tenant_id = '{tid}'",
        f"DELETE FROM campuses WHERE tenant_id = '{tid}'",
        f"DELETE FROM roles WHERE tenant_id = '{tid}'",
        f"DELETE FROM tenants WHERE id = '{tid}'",
    ]
    # Each step runs in its own connection+transaction — failures are isolated
    for sql in steps:
        try:
            with engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
        except Exception as e:
            table = sql.split("FROM")[1].split()[0] if "FROM" in sql else sql
            print(f"  [skip] {table}: {type(e).__name__}")

    # Verify tenant is gone
    with engine.connect() as conn:
        remaining = conn.execute(text(f"SELECT id FROM tenants WHERE id = '{tid}'")).first()
        if remaining:
            print("  [ERROR] tenant still exists — tables still holding rows:")
            # Check every table that could have tenant_id rows
            for t, col, ref in [
                ("school_invoices",       "tenant_id", None),
                ("groups",                "tenant_id", None),
                ("sessions",              "tenant_id", None),
                ("assessments",           "tenant_id", None),
                ("threads",               "tenant_id", None),
                ("relationships",         "tenant_id", None),
                ("users",                 "tenant_id", None),
                ("subjects",              "tenant_id", None),
                ("academic_years",        "tenant_id", None),
                ("campuses",              "tenant_id", None),
                ("roles",                 "tenant_id", None),
                ("attendance_records",    "tenant_id", None),
                ("grade_categories",      "tenant_id", None),
                ("homework",              "tenant_id", None),
                ("notifications",         "tenant_id", None),
                ("calendar_events",       "tenant_id", None),
                ("tutoring_invoices",     "tenant_id", None),
                ("wallets",               "tenant_id", None),
            ]:
                try:
                    n = conn.execute(text(
                        f"SELECT COUNT(*) FROM {t} WHERE {col} = '{tid}'"
                    )).scalar()
                    if n:
                        print(f"    BLOCKING: {t} still has {n} row(s)")
                except Exception:
                    pass
            raise RuntimeError(f"Could not delete tenant '{SLUG}' — see BLOCKING tables above")

    print(f"Deleted existing tenant '{SLUG}'")


def seed(db):
    print("Creating private tutor profile...")

    # ── Tenant ──────────────────────────────────────────────────────────────
    tenant = Tenant(
        name="Cours Particuliers — M. Rousseau",
        slug=SLUG,
        type="tutoring_center",
        settings={
            "timezone": "Europe/Paris",
            "locale": "fr",
            "currency": "EUR",
            # Minimal module set for a private tutor
            "enabled_modules": ["gradebook", "homework", "messaging", "billing", "calendar"],
            "grading_scale": 20,
            "school_address": "12 allée des Tilleuls\n69006 Lyon",
            "school_phone": "06 12 34 56 78",
            "default_bank_account": "FR76 3000 6000 0112 3456 7890 189",
            "default_contact_info": "Antoine Rousseau — Cours particuliers\nTél: 06 12 34 56 78 — rousseau.cours@email.fr\nVirement bancaire: FR76 3000 6000 0112 3456 7890 189",
            "labels": {
                "teacher": "Professeur",
                "learner": "Élève",
                "supervisor": "Parent",
            },
        },
        branding={
            "display_name": "Cours Particuliers Rousseau",
        },
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id

    # ── Campus (home-based — no physical room needed) ───────────────────────
    campus = Campus(tenant_id=tid, name="Domicile", is_default=True)
    db.add(campus)
    db.flush()

    # ── Roles ────────────────────────────────────────────────────────────────
    tutor_role = Role(
        tenant_id=tid, code="teacher", display_name="Professeur", is_system=True,
        permissions=[
            "gradebook.grade.create", "gradebook.grade.edit",
            "homework.create", "homework.edit",
            "attendance.record.create",
            "messaging.thread.send",
            "admin.user.view",
            "admin.user.create",
            "admin.user.edit",
        ],
    )
    student_role = Role(
        tenant_id=tid, code="student", display_name="Élève", is_system=True,
        permissions=[
            "gradebook.grade.view",
            "homework.submit",
            "messaging.thread.send",
        ],
    )
    parent_role = Role(
        tenant_id=tid, code="parent", display_name="Parent", is_system=True,
        permissions=[
            "gradebook.grade.view",
            "attendance.record.view",
            "messaging.thread.send",
        ],
    )
    db.add(tutor_role)
    db.add(student_role)
    db.add(parent_role)
    db.flush()

    # ── Academic year ────────────────────────────────────────────────────────
    year = AcademicYear(
        tenant_id=tid, name="2025-2026",
        start_date=date(2025, 9, 1), end_date=date(2026, 7, 4), is_current=True,
    )
    db.add(year)
    db.flush()

    term = Term(
        academic_year_id=year.id, name="Trimestre 1", order=1,
        start_date=date(2025, 9, 1), end_date=date(2025, 12, 20),
    )
    db.add(term)
    db.flush()

    # ── Subject ──────────────────────────────────────────────────────────────
    maths = Subject(
        tenant_id=tid, code="MATH", name="Mathématiques", color="#4A90D9", coefficient=1,
    )
    db.add(maths)
    db.flush()

    # ── Users ────────────────────────────────────────────────────────────────
    def make_user(email, first, last, role):
        u = User(
            tenant_id=tid, email=email, password_hash=PASSWORD,
            first_name=first, last_name=last,
            display_name=f"{first} {last}", status="active",
        )
        db.add(u)
        db.flush()
        db.add(UserRole(user_id=u.id, role_id=role.id, scope_type="tenant"))
        return u

    tutor   = make_user("prof.rousseau@demo.edulia.io", "Antoine",  "Rousseau", tutor_role)
    student = make_user("leo.martin@demo.edulia.io",    "Léo",      "Martin",   student_role)
    parent  = make_user("parent.martin@demo.edulia.io", "Isabelle", "Martin",   parent_role)

    # Parent → child relationship
    db.add(Relationship(
        tenant_id=tid,
        from_user_id=parent.id,
        to_user_id=student.id,
        type="guardian",
        is_primary=True,
    ))

    # ── Group (1-to-1 tutoring session) ─────────────────────────────────────
    group = Group(
        tenant_id=tid, campus_id=campus.id, academic_year_id=year.id,
        type="tutoring_group", name="Cours Particuliers — Léo Martin",
        description="Soutien en mathématiques, niveau 5ème",
        capacity=2,
    )
    db.add(group)
    db.flush()

    db.add(GroupMembership(group_id=group.id, user_id=tutor.id,   role_in_group="tutor"))
    db.add(GroupMembership(group_id=group.id, user_id=student.id, role_in_group="member"))

    # ── Weekly sessions (Mercredi 14h + Samedi 10h) ──────────────────────────
    for day, start, end in [(2, "14:00", "15:30"), (5, "10:00", "11:30")]:
        h1, m1 = map(int, start.split(":"))
        h2, m2 = map(int, end.split(":"))
        db.add(Session(
            tenant_id=tid, academic_year_id=year.id, group_id=group.id,
            subject_id=maths.id, teacher_id=tutor.id, room_id=None,
            day_of_week=day, start_time=time(h1, m1), end_time=time(h2, m2),
            recurrence="weekly", status="active",
        ))
    db.flush()

    # ── Assessments + grades (3 controls during T1) ──────────────────────────
    assessment_defs = [
        ("Contrôle — Fractions", date(2025, 9, 27), 20, 1,  12, "Des progrès à faire sur les divisions"),
        ("Contrôle — Équations", date(2025, 10, 25), 20, 2, 15, "Bon travail, méthode acquise"),
        ("Bilan T1",             date(2025, 12, 6),  20, 2, 17, "Excellent trimestre, Léo a bien progressé !"),
    ]
    for title, dt, max_s, coeff, score, comment in assessment_defs:
        a = Assessment(
            tenant_id=tid, subject_id=maths.id, group_id=group.id,
            term_id=term.id, category_id=None, teacher_id=tutor.id,
            title=title, date=dt, max_score=max_s,
            coefficient=Decimal(str(coeff)), is_published=True,
        )
        db.add(a)
        db.flush()
        db.add(Grade(
            assessment_id=a.id, student_id=student.id,
            score=Decimal(str(score)), comment=comment,
        ))
    db.flush()

    # ── Messages ─────────────────────────────────────────────────────────────
    # Thread 1: tutor → parent (progress report)
    th1 = Thread(
        tenant_id=tid, type="direct",
        subject="Bilan de Léo — Trimestre 1",
        created_by=tutor.id,
    )
    db.add(th1)
    db.flush()
    db.add(ThreadParticipant(thread_id=th1.id, user_id=tutor.id,  role="sender"))
    db.add(ThreadParticipant(thread_id=th1.id, user_id=parent.id, role="recipient"))
    db.add(Message(
        thread_id=th1.id, sender_id=tutor.id,
        body=(
            "Bonjour Mme Martin,\n\n"
            "Je vous envoie le bilan de Léo pour ce premier trimestre. "
            "Il a fait d'excellents progrès — il est passé de 12/20 en septembre à 17/20 au bilan. "
            "Sa méthode sur les équations est désormais solide.\n\n"
            "Je vous propose de continuer au même rythme en janvier (mercredi + samedi).\n\n"
            "Bonne fête de fin d'année,\nAntoine Rousseau"
        ),
    ))
    db.add(Message(
        thread_id=th1.id, sender_id=parent.id,
        body=(
            "Merci beaucoup M. Rousseau ! Léo est vraiment motivé depuis le début de vos séances. "
            "Oui, on continue en janvier, avec plaisir !"
        ),
    ))
    db.flush()

    # Thread 2: tutor → student (homework reminder)
    th2 = Thread(
        tenant_id=tid, type="direct",
        subject="Exercices avant samedi",
        created_by=tutor.id,
    )
    db.add(th2)
    db.flush()
    db.add(ThreadParticipant(thread_id=th2.id, user_id=tutor.id,    role="sender"))
    db.add(ThreadParticipant(thread_id=th2.id, user_id=student.id,  role="recipient"))
    db.add(Message(
        thread_id=th2.id, sender_id=tutor.id,
        body="Bonjour Léo ! N'oublie pas les exercices p.47 (ex. 3, 4, 5) avant samedi. À samedi !",
    ))
    db.add(Message(
        thread_id=th2.id, sender_id=student.id,
        body="Ok M. Rousseau, j'ai déjà fait les ex. 3 et 4. Je finirai le 5 ce soir.",
    ))
    db.flush()

    # ── Invoices ─────────────────────────────────────────────────────────────
    # Invoice 1: T1 — sent & paid
    inv1 = SchoolInvoice(
        tenant_id=tid,
        invoice_number="FACT-202509-0001",
        created_by=tutor.id,
        student_id=student.id,
        student_name="Léo Martin",
        student_class="5ème — Cours particuliers Mathématiques",
        parent_name="Isabelle Martin",
        parent_address={"line1": "14 rue des Acacias", "city": "Lyon", "postal_code": "69003", "phone": "06 98 76 54 32"},
        academic_year="2025-2026",
        issue_date=date(2025, 9, 1),
        status="paid",
        line_items=[
            {"description": "Séances de mathématiques — Septembre 2025 (4 séances × 1h30)", "qty": 4, "unit_price_cents": 5000, "total_cents": 20000},
        ],
        subtotal_cents=20000,
        previous_balance_cents=0,
        total_due_cents=20000,
        paid_cents=20000,
        payment_schedule=[{"date": "2025-09-05", "amount_cents": 20000}],
        payment_method="Virement",
        contact_info="Antoine Rousseau — IBAN FR76 3000 6000 0112 3456 7890 189",
        notes="Merci pour votre confiance !",
    )
    db.add(inv1)

    # Invoice 2: T1 continuation — sent, awaiting payment
    inv2 = SchoolInvoice(
        tenant_id=tid,
        invoice_number="FACT-202510-0002",
        created_by=tutor.id,
        student_id=student.id,
        student_name="Léo Martin",
        student_class="5ème — Cours particuliers Mathématiques",
        parent_name="Isabelle Martin",
        parent_address={"line1": "14 rue des Acacias", "city": "Lyon", "postal_code": "69003", "phone": "06 98 76 54 32"},
        academic_year="2025-2026",
        issue_date=date(2025, 10, 1),
        status="sent",
        line_items=[
            {"description": "Séances de mathématiques — Octobre 2025 (4 séances × 1h30)", "qty": 4, "unit_price_cents": 5000, "total_cents": 20000},
            {"description": "Support pédagogique — fascicule exercices", "qty": 1, "unit_price_cents": 1500, "total_cents": 1500},
        ],
        subtotal_cents=21500,
        previous_balance_cents=0,
        total_due_cents=21500,
        paid_cents=0,
        payment_schedule=[{"date": "2025-10-05", "amount_cents": 21500}],
        payment_method="Virement",
        contact_info="Antoine Rousseau — IBAN FR76 3000 6000 0112 3456 7890 189",
    )
    db.add(inv2)
    db.flush()

    print(f"  Tenant  : {tenant.name} (slug: {SLUG})")
    print(f"  Tutor   : {tutor.email}")
    print(f"  Student : {student.email}")
    print(f"  Parent  : {parent.email}")
    print(f"  Group   : {group.name}")
    print(f"  Modules : {tenant.settings['enabled_modules']}")
    print(f"  Password: demo2026")


def main():
    parser = argparse.ArgumentParser(description="Seed a private tutor demo profile")
    parser.add_argument("--reset", action="store_true", help="Delete existing data before seeding")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        delete_existing(db)
        db = SessionLocal()  # fresh session after delete closed the old one
        seed(db)
        db.commit()
        print("\nPrivate tutor profile created successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
