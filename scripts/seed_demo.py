#!/usr/bin/env python3
"""Seed demo sandbox data for Edulia.

Creates 3 demo workspaces with realistic data:
- Ecole Moliere (school): 5 classes, 10 teachers, ~30 students, full timetable, grades, attendance
- TutorPro Lyon (tutoring): 1 tutor, 4 students
- FormaTech SA (enterprise): 1 admin, 5 employees

Usage:
    python scripts/seed_demo.py          # Seed (idempotent — deletes existing demo data first)
    python scripts/seed_demo.py --reset  # Same as above (alias for cron)

Designed to run every 10 minutes via cron for sandbox reset.
"""
import argparse
import os
import sys
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.db.models import (
    Certificate, Course, LearningPlatform, Portfolio,
    AcademicYear, Assessment, AttendanceRecord, Campus, Form, FormField, FormResponse,
    Grade, GradeCategory, Group, GroupMembership, Homework, Message, Notification,
    Relationship, Role, Room, Session, SessionException, Subject, Submission,
    Tenant, Term, Thread, ThreadParticipant, User, UserRole,
    Wallet, WalletTransaction, ServiceCatalog, ServiceSubscription,
)

DEMO_PASSWORD = hash_password("demo2026")
DEMO_SLUGS = ["ecole-moliere", "tutorpro-lyon", "formatech-sa"]


def delete_demo_data(db):
    """Delete all demo tenants and cascaded data using raw SQL."""
    from sqlalchemy import text
    for slug in DEMO_SLUGS:
        tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
        if tenant:
            tid = str(tenant.id)
            # Disable FK checks temporarily and delete in safe order
            tables_with_tenant = [
                "wallet_transactions", "wallets", "service_subscriptions", "service_catalog",
                "form_responses", "form_fields", "forms",
                "submissions", "homework",
                "grades", "assessments", "grade_categories",
                "attendance_records", "session_exceptions", "sessions", "rooms",
                "messages", "thread_participants", "threads",
                "notifications",
                "group_memberships", "groups",
                "certificates", "portfolios",
                "relationships", "user_roles", "roles", "users",
                "subjects", "terms", "academic_years", "campuses", "tenants",
            ]
            for table in tables_with_tenant:
                col = "id" if table == "tenants" else "tenant_id"
                try:
                    # For tables without tenant_id, delete via parent FK
                    if table in ("wallet_transactions",):
                        db.execute(text(f"DELETE FROM {table} WHERE wallet_id IN (SELECT id FROM wallets WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("grades",):
                        db.execute(text(f"DELETE FROM {table} WHERE assessment_id IN (SELECT id FROM assessments WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("submissions",):
                        db.execute(text(f"DELETE FROM {table} WHERE homework_id IN (SELECT id FROM homework WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("form_responses", "form_fields"):
                        db.execute(text(f"DELETE FROM {table} WHERE form_id IN (SELECT id FROM forms WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("messages", "thread_participants"):
                        db.execute(text(f"DELETE FROM {table} WHERE thread_id IN (SELECT id FROM threads WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("group_memberships",):
                        db.execute(text(f"DELETE FROM {table} WHERE group_id IN (SELECT id FROM groups WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("session_exceptions",):
                        db.execute(text(f"DELETE FROM {table} WHERE session_id IN (SELECT id FROM sessions WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("user_roles",):
                        db.execute(text(f"DELETE FROM {table} WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("certificates", "portfolios"):
                        db.execute(text(f"DELETE FROM {table} WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table in ("terms",):
                        db.execute(text(f"DELETE FROM {table} WHERE academic_year_id IN (SELECT id FROM academic_years WHERE tenant_id = :tid)"), {"tid": tid})
                    elif table == "tenants":
                        db.execute(text(f"DELETE FROM {table} WHERE id = :tid"), {"tid": tid})
                    else:
                        db.execute(text(f"DELETE FROM {table} WHERE tenant_id = :tid"), {"tid": tid})
                except Exception as e:
                    pass  # Table might not exist or no rows
    db.commit()
    print("Deleted existing demo data")



def create_user(db, tenant_id, email, first_name, last_name, role_id, status="active"):
    """Create a user and assign a role."""
    user = User(
        tenant_id=tenant_id, email=email, password_hash=DEMO_PASSWORD,
        first_name=first_name, last_name=last_name,
        display_name=f"{first_name} {last_name}", status=status,
    )
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role_id, scope_type="tenant"))
    return user


def seed_school(db):
    """Seed Ecole Moliere — full school demo."""
    print("Seeding Ecole Moliere...")

    # Tenant
    tenant = Tenant(
        name="Collège Molière", slug="ecole-moliere", type="school",
        settings={
            "timezone": "Europe/Paris", "locale": "fr", "currency": "EUR",
            "enabled_modules": [
                "timetable", "attendance", "gradebook", "messaging",
                "homework", "documents", "forms", "wallet", "community",
            ],
            "grading_scale": 20,
        },
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id

    # Campus
    campus = Campus(tenant_id=tid, name="Campus principal", is_default=True,
                    address={"street": "12 rue Molière", "city": "Lyon", "zip": "69002"})
    db.add(campus)
    db.flush()

    # Roles
    roles = {}
    role_defs = [
        ("admin", "Administrateur", True, ["admin.user.create", "admin.user.edit", "admin.user.delete",
            "admin.user.view", "admin.tenant.edit", "admin.role.manage",
            "gradebook.grade.create", "gradebook.grade.edit", "attendance.record.create", "messaging.thread.send"]),
        ("teacher", "Enseignant", True, ["gradebook.grade.create", "gradebook.grade.edit",
            "attendance.record.create", "messaging.thread.send", "homework.create"]),
        ("student", "Élève", True, ["gradebook.grade.view", "messaging.thread.send", "homework.submit"]),
        ("parent", "Parent", True, ["gradebook.grade.view", "attendance.record.view", "messaging.thread.send"]),
    ]
    for code, display, is_sys, perms in role_defs:
        r = Role(tenant_id=tid, code=code, display_name=display, is_system=is_sys, permissions=perms)
        db.add(r)
        db.flush()
        roles[code] = r

    # Academic year + terms
    year = AcademicYear(
        tenant_id=tid, name="2025-2026",
        start_date=date(2025, 9, 1), end_date=date(2026, 7, 4), is_current=True,
    )
    db.add(year)
    db.flush()

    terms = []
    term_defs = [
        ("Trimestre 1", date(2025, 9, 1), date(2025, 12, 20), 1),
        ("Trimestre 2", date(2026, 1, 5), date(2026, 3, 28), 2),
        ("Trimestre 3", date(2026, 3, 31), date(2026, 7, 4), 3),
    ]
    for name, start, end, order in term_defs:
        t = Term(academic_year_id=year.id, name=name, start_date=start, end_date=end, order=order)
        db.add(t)
        db.flush()
        terms.append(t)

    # Subjects
    subjects = {}
    subject_defs = [
        ("MATH", "Mathématiques", "#4A90D9", 4), ("FR", "Français", "#E67E22", 4),
        ("HG", "Histoire-Géographie", "#8E44AD", 3), ("SVT", "SVT", "#27AE60", 2),
        ("PC", "Physique-Chimie", "#E74C3C", 2), ("EN", "Anglais", "#3498DB", 3),
        ("EPS", "EPS", "#F39C12", 2), ("ART", "Arts plastiques", "#9B59B6", 1),
        ("MUS", "Musique", "#1ABC9C", 1), ("TECH", "Technologie", "#34495E", 1),
    ]
    for code, name, color, coef in subject_defs:
        s = Subject(tenant_id=tid, code=code, name=name, color=color, coefficient=coef)
        db.add(s)
        db.flush()
        subjects[code] = s

    # Rooms
    rooms = {}
    room_defs = [
        ("S101", 30), ("S102", 30), ("S103", 30), ("S201", 28),
        ("Labo1", 24), ("Labo2", 24), ("Info1", 20),
        ("Gym", 60), ("Arts", 25), ("Musique", 25),
    ]
    for name, cap in room_defs:
        r = Room(tenant_id=tid, campus_id=campus.id, name=name, capacity=cap)
        db.add(r)
        db.flush()
        rooms[name] = r

    # Admin
    admin = create_user(db, tid, "admin@demo.edulia.io", "Marie", "Directeur", roles["admin"].id)

    # Teachers
    teachers = {}
    teacher_defs = [
        ("prof.martin@demo.edulia.io", "Pierre", "Martin", ["MATH"]),
        ("prof.dubois@demo.edulia.io", "Claire", "Dubois", ["FR"]),
        ("prof.lefevre@demo.edulia.io", "Jean", "Lefèvre", ["HG"]),
        ("prof.bernard@demo.edulia.io", "Sophie", "Bernard", ["SVT"]),
        ("prof.laurent@demo.edulia.io", "Michel", "Laurent", ["PC"]),
        ("prof.smith@demo.edulia.io", "Sarah", "Smith", ["EN"]),
        ("prof.garcia@demo.edulia.io", "Carlos", "Garcia", ["EPS"]),
        ("prof.moreau@demo.edulia.io", "Isabelle", "Moreau", ["ART"]),
        ("prof.roux@demo.edulia.io", "Antoine", "Roux", ["MUS"]),
        ("prof.petit@demo.edulia.io", "Thomas", "Petit", ["TECH"]),
    ]
    for email, first, last, subjs in teacher_defs:
        t = create_user(db, tid, email, first, last, roles["teacher"].id)
        for s in subjs:
            teachers[s] = t

    # Classes (groups)
    classes = {}
    class_defs = ["6eA", "6eB", "5eA", "5eB", "4eA"]
    for name in class_defs:
        g = Group(tenant_id=tid, campus_id=campus.id, academic_year_id=year.id,
                  type="class", name=name, capacity=30)
        db.add(g)
        db.flush()
        classes[name] = g

    # Students — 6 per class for demo (not 30, keeps it manageable)
    student_names = [
        # 6eA
        ("emma.leroy@demo.edulia.io", "Emma", "Leroy", "6eA"),
        ("lucas.moreau@demo.edulia.io", "Lucas", "Moreau", "6eA"),
        ("lea.bernard@demo.edulia.io", "Léa", "Bernard", "6eA"),
        ("hugo.petit@demo.edulia.io", "Hugo", "Petit", "6eA"),
        ("chloe.robert@demo.edulia.io", "Chloé", "Robert", "6eA"),
        ("nathan.richard@demo.edulia.io", "Nathan", "Richard", "6eA"),
        # 6eB
        ("manon.simon@demo.edulia.io", "Manon", "Simon", "6eB"),
        ("theo.laurent@demo.edulia.io", "Théo", "Laurent", "6eB"),
        ("camille.michel@demo.edulia.io", "Camille", "Michel", "6eB"),
        ("enzo.garcia@demo.edulia.io", "Enzo", "Garcia", "6eB"),
        ("jade.thomas@demo.edulia.io", "Jade", "Thomas", "6eB"),
        ("louis.durand@demo.edulia.io", "Louis", "Durand", "6eB"),
        # 5eA
        ("alice.martin@demo.edulia.io", "Alice", "Martin", "5eA"),
        ("raphael.dubois@demo.edulia.io", "Raphaël", "Dubois", "5eA"),
        ("lina.lefebvre@demo.edulia.io", "Lina", "Lefebvre", "5eA"),
        ("adam.roux@demo.edulia.io", "Adam", "Roux", "5eA"),
        ("sarah.fournier@demo.edulia.io", "Sarah", "Fournier", "5eA"),
        ("gabriel.girard@demo.edulia.io", "Gabriel", "Girard", "5eA"),
        # 5eB
        ("ines.bonnet@demo.edulia.io", "Inès", "Bonnet", "5eB"),
        ("tom.dupont@demo.edulia.io", "Tom", "Dupont", "5eB"),
        ("eva.lambert@demo.edulia.io", "Eva", "Lambert", "5eB"),
        ("noah.fontaine@demo.edulia.io", "Noah", "Fontaine", "5eB"),
        ("louise.mercier@demo.edulia.io", "Louise", "Mercier", "5eB"),
        ("paul.rousseau@demo.edulia.io", "Paul", "Rousseau", "5eB"),
        # 4eA
        ("clara.morel@demo.edulia.io", "Clara", "Morel", "4eA"),
        ("maxime.henry@demo.edulia.io", "Maxime", "Henry", "4eA"),
        ("zoe.david@demo.edulia.io", "Zoé", "David", "4eA"),
        ("jules.bertrand@demo.edulia.io", "Jules", "Bertrand", "4eA"),
        ("lola.leroy2@demo.edulia.io", "Lola", "Leroy", "4eA"),
        ("ethan.perrin@demo.edulia.io", "Ethan", "Perrin", "4eA"),
    ]

    students = {}
    for email, first, last, cls in student_names:
        s = create_user(db, tid, email, first, last, roles["student"].id)
        students[email] = s
        db.add(GroupMembership(group_id=classes[cls].id, user_id=s.id, role_in_group="member"))

    # Add teachers to their class groups
    # Each teacher teaches all classes for their subject, but we add them to 6eA as "teacher" member
    for subj_code, teacher in teachers.items():
        db.add(GroupMembership(group_id=classes["6eA"].id, user_id=teacher.id, role_in_group="teacher"))

    # Parents — 2 demo parents
    parent_leroy = create_user(db, tid, "parent.leroy@demo.edulia.io", "François", "Leroy", roles["parent"].id)
    parent_moreau = create_user(db, tid, "parent.moreau@demo.edulia.io", "Catherine", "Moreau", roles["parent"].id)

    # Parent-child relationships
    emma = students["emma.leroy@demo.edulia.io"]
    lucas = students["lucas.moreau@demo.edulia.io"]
    db.add(Relationship(tenant_id=tid, from_user_id=parent_leroy.id, to_user_id=emma.id, type="guardian", is_primary=True))
    db.add(Relationship(tenant_id=tid, from_user_id=parent_moreau.id, to_user_id=lucas.id, type="guardian", is_primary=True))

    # ========== TIMETABLE ==========
    # 6eA full week timetable
    timetable_6ea = [
        # (day, start, end, subject_code, room_name)
        (0, "08:00", "09:00", "MATH", "S101"), (0, "09:00", "10:00", "FR", "S102"),
        (0, "11:00", "12:00", "EN", "S201"), (0, "14:00", "15:00", "HG", "S103"),
        (0, "15:00", "16:00", "TECH", "Info1"),
        (1, "08:00", "09:00", "FR", "S102"), (1, "09:00", "10:00", "MATH", "S101"),
        (1, "10:00", "11:00", "HG", "S103"), (1, "11:00", "12:00", "SVT", "Labo1"),
        (1, "14:00", "15:00", "ART", "Arts"), (1, "15:00", "16:00", "EPS", "Gym"),
        (2, "08:00", "09:00", "MATH", "S101"), (2, "09:00", "10:00", "SVT", "Labo1"),
        (3, "08:00", "09:00", "EN", "S201"), (3, "09:00", "10:00", "MATH", "S101"),
        (3, "10:00", "11:00", "FR", "S102"), (3, "11:00", "12:00", "EPS", "Gym"),
        (3, "14:00", "15:00", "PC", "Labo2"), (3, "15:00", "16:00", "TECH", "Info1"),
        (4, "08:00", "09:00", "FR", "S102"), (4, "09:00", "10:00", "HG", "S103"),
        (4, "10:00", "11:00", "EPS", "Gym"), (4, "11:00", "12:00", "MUS", "Musique"),
    ]

    sessions_6ea = []
    for day, start, end, subj, room in timetable_6ea:
        h1, m1 = map(int, start.split(":"))
        h2, m2 = map(int, end.split(":"))
        s = Session(
            tenant_id=tid, academic_year_id=year.id, group_id=classes["6eA"].id,
            subject_id=subjects[subj].id, teacher_id=teachers[subj].id,
            room_id=rooms[room].id, day_of_week=day,
            start_time=time(h1, m1), end_time=time(h2, m2),
            recurrence="weekly", status="active",
        )
        db.add(s)
        db.flush()
        sessions_6ea.append(s)

    # Minimal timetable for other classes (just a few sessions each)
    for cls_name in ["6eB", "5eA", "5eB", "4eA"]:
        for day, start, end, subj, room in [(0, "08:00", "09:00", "MATH", "S101"), (0, "09:00", "10:00", "FR", "S102"),
                                             (1, "08:00", "09:00", "EN", "S201"), (2, "08:00", "09:00", "HG", "S103")]:
            h1, m1 = map(int, start.split(":"))
            h2, m2 = map(int, end.split(":"))
            db.add(Session(
                tenant_id=tid, academic_year_id=year.id, group_id=classes[cls_name].id,
                subject_id=subjects[subj].id, teacher_id=teachers[subj].id,
                room_id=rooms[room].id, day_of_week=day,
                start_time=time(h1, m1), end_time=time(h2, m2),
                recurrence="weekly", status="active",
            ))

    db.flush()

    # ========== ATTENDANCE ==========
    # 2 weeks of attendance for 6eA students
    emma_id = emma.id
    for s in sessions_6ea[:10]:  # First 10 sessions
        d = date(2025, 10, 14 + s.day_of_week)  # Week of Oct 14
        for st_email, st in students.items():
            if "6eA" not in st_email.replace("@demo.edulia.io", ""):
                # Check if student is in 6eA by checking group membership
                pass
        # Just record for the 6 students in 6eA
        for st_email in ["emma.leroy@demo.edulia.io", "lucas.moreau@demo.edulia.io",
                         "lea.bernard@demo.edulia.io", "hugo.petit@demo.edulia.io",
                         "chloe.robert@demo.edulia.io", "nathan.richard@demo.edulia.io"]:
            st = students[st_email]
            status = "present"
            late_min = None
            justified = False
            reason = None
            # Emma: absent Monday 08:00, late Tuesday 11:00
            if st_email == "emma.leroy@demo.edulia.io":
                if s.day_of_week == 0 and s.start_time == time(8, 0):
                    status = "absent"
                    justified = True
                    reason = "Rendez-vous médical"
                elif s.day_of_week == 1 and s.start_time == time(11, 0):
                    status = "late"
                    late_min = 15
            # Lucas: absent one day
            if st_email == "lucas.moreau@demo.edulia.io" and s.day_of_week == 3 and s.start_time == time(8, 0):
                status = "absent"
                reason = "Maladie"

            db.add(AttendanceRecord(
                tenant_id=tid, session_id=s.id, student_id=st.id,
                date=d, status=status, late_minutes=late_min,
                reason=reason, justified=justified, recorded_by=admin.id,
            ))

    db.flush()

    # ========== GRADEBOOK ==========
    t1 = terms[0]  # Trimestre 1
    prof_martin = teachers["MATH"]
    prof_dubois = teachers["FR"]

    # Grade categories
    cat_math = GradeCategory(tenant_id=tid, subject_id=subjects["MATH"].id,
                             group_id=classes["6eA"].id, term_id=t1.id,
                             name="Contrôles", weight=Decimal("3"))
    cat_fr = GradeCategory(tenant_id=tid, subject_id=subjects["FR"].id,
                           group_id=classes["6eA"].id, term_id=t1.id,
                           name="Contrôles", weight=Decimal("3"))
    db.add(cat_math)
    db.add(cat_fr)
    db.flush()

    # Assessments
    assessments = []
    assess_defs = [
        (subjects["MATH"].id, classes["6eA"].id, t1.id, cat_math.id, prof_martin.id,
         "Contrôle Ch.3 - Fractions", date(2025, 10, 5), 20),
        (subjects["MATH"].id, classes["6eA"].id, t1.id, cat_math.id, prof_martin.id,
         "Contrôle Ch.4 - Géométrie", date(2025, 10, 25), 20),
        (subjects["MATH"].id, classes["6eA"].id, t1.id, cat_math.id, prof_martin.id,
         "Contrôle Ch.5 - Calcul mental", date(2025, 11, 15), 20),
        (subjects["FR"].id, classes["6eA"].id, t1.id, cat_fr.id, prof_dubois.id,
         "Dictée n°3", date(2025, 10, 8), 20),
        (subjects["FR"].id, classes["6eA"].id, t1.id, cat_fr.id, prof_dubois.id,
         "Rédaction - Mon animal", date(2025, 10, 20), 20),
        (subjects["FR"].id, classes["6eA"].id, t1.id, cat_fr.id, prof_dubois.id,
         "Contrôle grammaire", date(2025, 11, 10), 20),
    ]
    for subj_id, grp_id, term_id, cat_id, teacher_id, title, dt, max_score in assess_defs:
        a = Assessment(
            tenant_id=tid, subject_id=subj_id, group_id=grp_id, term_id=term_id,
            category_id=cat_id, teacher_id=teacher_id, title=title,
            date=dt, max_score=max_score, coefficient=Decimal("1"), is_published=True,
        )
        db.add(a)
        db.flush()
        assessments.append(a)

    # Grades for all 6eA students
    grade_data = {
        "emma.leroy@demo.edulia.io":    [16, 14, 15, 13, 15, 14],
        "lucas.moreau@demo.edulia.io":  [11, 12, 10, 9, 11, 13],
        "lea.bernard@demo.edulia.io":   [14, 15, 16, 17, 14, 15],
        "hugo.petit@demo.edulia.io":    [8, 10, 9, 12, 11, 10],
        "chloe.robert@demo.edulia.io":  [18, 17, 19, 16, 18, 17],
        "nathan.richard@demo.edulia.io":[13, 12, 14, 11, 13, 12],
    }
    for email, scores in grade_data.items():
        st = students[email]
        for i, score in enumerate(scores):
            db.add(Grade(
                assessment_id=assessments[i].id, student_id=st.id,
                score=Decimal(str(score)),
            ))

    db.flush()

    # ========== HOMEWORK ==========
    hw_defs = [
        (subjects["MATH"].id, classes["6eA"].id, prof_martin.id,
         "Exercices Ch.5 p.47", "Faire les exercices 1 à 8 page 47",
         date(2025, 10, 21), date(2025, 10, 28), True, "both"),
        (subjects["FR"].id, classes["6eA"].id, prof_dubois.id,
         "Rédaction: Mon animal préféré", "Rédiger un texte de 200 mots minimum décrivant votre animal préféré.",
         date(2025, 10, 20), date(2025, 10, 30), True, "text"),
        (subjects["HG"].id, classes["6eA"].id, teachers["HG"].id,
         "Frise chronologique", "Réaliser une frise chronologique de l'Antiquité",
         date(2025, 10, 28), date(2025, 11, 4), True, "file"),
        (subjects["SVT"].id, classes["6eA"].id, teachers["SVT"].id,
         "Compte-rendu TP cellules", "Rédiger le compte-rendu du TP d'observation des cellules au microscope",
         date(2025, 10, 30), date(2025, 11, 5), True, "both"),
    ]
    homeworks = []
    for subj_id, grp_id, teacher_id, title, desc, assigned, due, allow, sub_type in hw_defs:
        hw = Homework(
            tenant_id=tid, subject_id=subj_id, group_id=grp_id, teacher_id=teacher_id,
            title=title, description=desc, assigned_date=assigned, due_date=due,
            allow_submission=allow, submission_type=sub_type,
        )
        db.add(hw)
        db.flush()
        homeworks.append(hw)

    # Emma submitted first 2 homeworks
    db.add(Submission(
        homework_id=homeworks[0].id, student_id=emma.id,
        content="Exercice 1: 3/4 + 1/2 = 3/4 + 2/4 = 5/4\nExercice 2: ...",
        status="graded", grade=Decimal("16"), teacher_feedback="Très bien, calculs justes.",
        graded_at=datetime(2025, 10, 29, 14, 0),
    ))
    db.add(Submission(
        homework_id=homeworks[1].id, student_id=emma.id,
        content="Mon animal préféré est le chat. J'ai un chat qui s'appelle Moustache...",
        status="graded", grade=Decimal("14"), teacher_feedback="Bonne rédaction, attention aux accords.",
        graded_at=datetime(2025, 10, 31, 10, 0),
    ))
    # Lucas submitted homework 1 late
    db.add(Submission(
        homework_id=homeworks[0].id, student_id=lucas.id,
        content="Exercice 1: 3/4 + 1/2 = 5/6 ...",
        status="late",
    ))

    db.flush()

    # ========== MESSAGING ==========
    # Thread 1: Teacher → Parents (announcement)
    t1_thread = Thread(tenant_id=tid, type="announcement", subject="Réunion parents-professeurs 15 novembre",
                       created_by=prof_martin.id)
    db.add(t1_thread)
    db.flush()
    for u in [prof_martin, parent_leroy, parent_moreau]:
        db.add(ThreadParticipant(thread_id=t1_thread.id, user_id=u.id,
                                 role="sender" if u == prof_martin else "recipient"))
    db.add(Message(thread_id=t1_thread.id, sender_id=prof_martin.id,
                   body="Chers parents,\n\nLa réunion parents-professeurs aura lieu le vendredi 15 novembre à 18h en salle polyvalente.\n\nCordialement,\nM. Martin"))
    db.flush()

    # Thread 2: Prof Dubois → Parent Leroy (individual)
    t2_thread = Thread(tenant_id=tid, type="direct", subject="Progrès d'Emma en dictée",
                       created_by=prof_dubois.id)
    db.add(t2_thread)
    db.flush()
    db.add(ThreadParticipant(thread_id=t2_thread.id, user_id=prof_dubois.id, role="sender"))
    db.add(ThreadParticipant(thread_id=t2_thread.id, user_id=parent_leroy.id, role="recipient"))
    db.add(Message(thread_id=t2_thread.id, sender_id=prof_dubois.id,
                   body="Bonjour M. Leroy,\n\nJe voulais vous informer qu'Emma a fait de gros progrès en dictée ce trimestre. Sa dernière note est 15/20.\n\nMme Dubois"))
    db.add(Message(thread_id=t2_thread.id, sender_id=parent_leroy.id,
                   body="Merci beaucoup Mme Dubois, nous sommes très contents de ses progrès. Nous l'encourageons à continuer.\n\nCordialement"))
    db.flush()

    # Thread 3: Admin → All (announcement)
    t3_thread = Thread(tenant_id=tid, type="announcement", subject="Horaires modifiés mercredi 6 novembre",
                       created_by=admin.id)
    db.add(t3_thread)
    db.flush()
    db.add(ThreadParticipant(thread_id=t3_thread.id, user_id=admin.id, role="sender"))
    db.add(Message(thread_id=t3_thread.id, sender_id=admin.id,
                   body="En raison d'une journée pédagogique, les cours du mercredi 6 novembre seront annulés. L'accueil reste ouvert de 8h à 12h."))

    # Thread 4: Parent → Teacher (question)
    t4_thread = Thread(tenant_id=tid, type="direct", subject="Question sur le contrôle de maths",
                       created_by=parent_leroy.id)
    db.add(t4_thread)
    db.flush()
    db.add(ThreadParticipant(thread_id=t4_thread.id, user_id=parent_leroy.id, role="sender"))
    db.add(ThreadParticipant(thread_id=t4_thread.id, user_id=prof_martin.id, role="recipient"))
    db.add(Message(thread_id=t4_thread.id, sender_id=parent_leroy.id,
                   body="Bonjour M. Martin,\n\nEmma m'a dit qu'un contrôle était prévu la semaine prochaine. Pourriez-vous me préciser les chapitres concernés ?\n\nMerci"))
    db.flush()

    # ========== FORMS ==========
    # Form 1: Museum trip consent
    form1 = Form(tenant_id=tid, title="Autorisation sortie musée des Beaux-Arts",
                 description="Sortie pédagogique au musée des Beaux-Arts de Lyon, le 20 novembre 2025.",
                 type="consent", status="published", target_roles=["parent"],
                 deadline=datetime(2025, 11, 15), created_by=admin.id)
    db.add(form1)
    db.flush()
    db.add(FormField(form_id=form1.id, label="J'autorise mon enfant à participer", field_type="checkbox", required=True, position=0))
    db.add(FormField(form_id=form1.id, label="Allergie ou traitement particulier", field_type="textarea", required=False, position=1))
    db.add(FormField(form_id=form1.id, label="Numéro de téléphone d'urgence", field_type="text", required=True, position=2))
    # Parent Leroy responded
    db.add(FormResponse(form_id=form1.id, user_id=parent_leroy.id,
                        data={"0": True, "1": "Aucune allergie", "2": "06 12 34 56 78"}))
    db.flush()

    # ========== WALLET (for canteen) ==========
    # Only for Emma (demo)
    wallet = Wallet(tenant_id=tid, user_id=emma.id, balance_cents=4500, currency="EUR")
    db.add(wallet)
    db.flush()
    db.add(WalletTransaction(wallet_id=wallet.id, amount_cents=10000, type="topup",
                             description="Rechargement septembre"))
    db.add(WalletTransaction(wallet_id=wallet.id, amount_cents=-3000, type="debit",
                             description="Cantine octobre (15 repas × 2€)"))
    db.add(WalletTransaction(wallet_id=wallet.id, amount_cents=-2500, type="debit",
                             description="Cantine novembre (12 repas × 2€ + sortie musée 1€)"))

    # Canteen service
    cantine = ServiceCatalog(tenant_id=tid, name="Cantine", category="cantine",
                             unit_price_cents=200, billing_period="daily", active=True)
    db.add(cantine)
    db.flush()
    db.add(ServiceSubscription(tenant_id=tid, student_id=emma.id, service_id=cantine.id,
                               days_of_week=[0, 1, 3, 4], status="active"))

    db.flush()
    print(f"  Ecole Moliere: {len(student_names)} students, {len(teacher_defs)} teachers, "
          f"{len(timetable_6ea)} timetable sessions, {len(assessments)} assessments, "
          f"{len(homeworks)} homework assignments")


def seed_tutoring(db):
    """Seed TutorPro Lyon — tutoring center demo."""
    print("Seeding TutorPro Lyon...")

    tenant = Tenant(
        name="TutorPro Lyon", slug="tutorpro-lyon", type="tutoring_center",
        settings={
            "timezone": "Europe/Paris", "locale": "fr", "currency": "EUR",
            "enabled_modules": ["timetable", "attendance", "messaging", "wallet"],
            "grading_scale": 20,
        },
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id

    campus = Campus(tenant_id=tid, name="Centre Lyon 3ème", is_default=True)
    db.add(campus)
    db.flush()

    # Roles
    roles = {}
    for code, display in [("admin", "Administrateur"), ("teacher", "Tuteur"),
                           ("student", "Élève"), ("parent", "Parent")]:
        r = Role(tenant_id=tid, code=code, display_name=display, is_system=True, permissions=[])
        db.add(r)
        db.flush()
        roles[code] = r

    year = AcademicYear(tenant_id=tid, name="2025-2026",
                        start_date=date(2025, 9, 1), end_date=date(2026, 7, 4), is_current=True)
    db.add(year)
    db.flush()

    tutor = create_user(db, tid, "sophie@demo.edulia.io", "Sophie", "Martinez", roles["teacher"].id)

    # Subjects
    maths = Subject(tenant_id=tid, code="MATH", name="Mathématiques", color="#4A90D9", coefficient=1)
    french = Subject(tenant_id=tid, code="FR", name="Français", color="#E67E22", coefficient=1)
    db.add(maths)
    db.add(french)
    db.flush()

    # 4 students
    group = Group(tenant_id=tid, campus_id=campus.id, academic_year_id=year.id,
                  type="tutoring_group", name="Groupe Maths 6e", capacity=6)
    db.add(group)
    db.flush()
    db.add(GroupMembership(group_id=group.id, user_id=tutor.id, role_in_group="tutor"))

    for email, first, last in [("julie.petit@demo.edulia.io", "Julie", "Petit"),
                                ("maxime.chen@demo.edulia.io", "Maxime", "Chen"),
                                ("yasmine.benhaddou@demo.edulia.io", "Yasmine", "Benhaddou"),
                                ("arthur.blanc@demo.edulia.io", "Arthur", "Blanc")]:
        s = create_user(db, tid, email, first, last, roles["student"].id)
        db.add(GroupMembership(group_id=group.id, user_id=s.id, role_in_group="member"))

    parent_petit = create_user(db, tid, "parent.petit@demo.edulia.io", "Marc", "Petit", roles["parent"].id)

    # Sessions: Mon 17h, Wed 14h, Sat 10h
    room = Room(tenant_id=tid, campus_id=campus.id, name="Salle A", capacity=8)
    db.add(room)
    db.flush()
    for day, start, end in [(0, "17:00", "18:30"), (2, "14:00", "15:30"), (5, "10:00", "11:30")]:
        h1, m1 = map(int, start.split(":"))
        h2, m2 = map(int, end.split(":"))
        db.add(Session(
            tenant_id=tid, academic_year_id=year.id, group_id=group.id,
            subject_id=maths.id, teacher_id=tutor.id, room_id=room.id,
            day_of_week=day, start_time=time(h1, m1), end_time=time(h2, m2),
            recurrence="weekly", status="active",
        ))

    db.flush()
    print("  TutorPro: 1 tutor, 4 students, 3 weekly sessions")


def seed_enterprise(db):
    """Seed FormaTech SA — enterprise training demo."""
    print("Seeding FormaTech SA...")

    tenant = Tenant(
        name="FormaTech SA", slug="formatech-sa", type="enterprise",
        settings={
            "timezone": "Europe/Paris", "locale": "fr", "currency": "EUR",
            "enabled_modules": ["timetable", "attendance", "messaging"],
            "grading_scale": 20,
        },
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id

    campus = Campus(tenant_id=tid, name="Siège Paris", is_default=True)
    db.add(campus)
    db.flush()

    roles = {}
    for code, display in [("admin", "RH"), ("student", "Collaborateur")]:
        r = Role(tenant_id=tid, code=code, display_name=display, is_system=True, permissions=[])
        db.add(r)
        db.flush()
        roles[code] = r

    year = AcademicYear(tenant_id=tid, name="2025-2026",
                        start_date=date(2025, 1, 1), end_date=date(2025, 12, 31), is_current=True)
    db.add(year)
    db.flush()

    admin = create_user(db, tid, "rh@demo.edulia.io", "Nathalie", "Durand", roles["admin"].id)

    for email, first, last in [
        ("jean.dupont@demo.edulia.io", "Jean", "Dupont"),
        ("marie.lefevre@demo.edulia.io", "Marie", "Lefèvre"),
        ("ahmed.benali@demo.edulia.io", "Ahmed", "Benali"),
        ("sophie.blanc@demo.edulia.io", "Sophie", "Blanc"),
        ("thomas.nguyen@demo.edulia.io", "Thomas", "Nguyen"),
    ]:
        create_user(db, tid, email, first, last, roles["student"].id)

    db.flush()
    print("  FormaTech: 1 admin, 5 employees")



def seed_hub_catalog(db):
    """Seed EduliaHub global catalog — platforms + courses."""
    print("Seeding EduliaHub catalog...")

    # Delete existing catalog data
    db.query(Course).delete(synchronize_session=False)
    db.query(LearningPlatform).delete(synchronize_session=False)
    db.query(Certificate).delete(synchronize_session=False)
    db.query(Portfolio).delete(synchronize_session=False)
    db.commit()

    platforms = {}
    platform_defs = [
        ("Khan Academy", "khan-academy", "https://khanacademy.org",
         "Free K-12 education: math, science, computing, history", True, False, ["en", "fr"], ["academic"]),
        ("Coursera", "coursera", "https://coursera.org",
         "University courses & professional certificates from top institutions", False, True, ["en", "fr", "es"], ["professional", "academic"]),
        ("AWS Skill Builder", "aws", "https://skillbuilder.aws",
         "Cloud computing training from Amazon Web Services", False, True, ["en"], ["professional"]),
        ("Microsoft Learn", "microsoft-learn", "https://learn.microsoft.com",
         "Free Azure, Microsoft 365, and Power Platform training", True, True, ["en", "fr"], ["professional"]),
        ("freeCodeCamp", "freecodecamp", "https://freecodecamp.org",
         "Learn to code for free — web development, Python, JavaScript", True, True, ["en"], ["professional", "skills"]),
        ("OpenClassrooms", "openclassrooms", "https://openclassrooms.com",
         "French-language tech and business courses with mentoring", False, True, ["fr", "en"], ["professional"]),
        ("Google Skillshop", "google-skillshop", "https://skillshop.withgoogle.com",
         "Google Ads, Analytics, and Cloud certifications", True, True, ["en", "fr"], ["professional"]),
        ("NVIDIA DLI", "nvidia-dli", "https://nvidia.com/training",
         "Deep learning and AI training from NVIDIA", False, True, ["en"], ["professional"]),
        ("Anthropic Academy", "anthropic", "https://anthropic.skilljar.com",
         "AI safety, Claude API, MCP protocol training", True, True, ["en"], ["professional"]),
        ("edX", "edx", "https://edx.org",
         "MIT, Harvard, Berkeley — free university courses online", False, True, ["en"], ["academic", "professional"]),
        ("FUN-MOOC", "fun-mooc", "https://fun-mooc.fr",
         "Free French university MOOCs", True, True, ["fr"], ["academic"]),
        ("Codecademy", "codecademy", "https://codecademy.com",
         "Interactive coding lessons in Python, JavaScript, SQL", False, True, ["en"], ["professional", "skills"]),
        ("Duolingo", "duolingo", "https://duolingo.com",
         "Language learning, gamified and free", True, False, ["en", "fr", "es"], ["skills"]),
        ("LinkedIn Learning", "linkedin-learning", "https://linkedin.com/learning",
         "Business, tech, and creative skills courses", False, True, ["en"], ["professional", "skills"]),
        ("Udemy", "udemy", "https://udemy.com",
         "Marketplace with thousands of courses on every topic", False, True, ["en", "fr"], ["professional", "skills"]),
    ]

    for name, slug, url, desc, free, certs, langs, cats in platform_defs:
        p = LearningPlatform(name=name, slug=slug, url=url, description=desc,
                             is_free=free, has_certificates=certs, languages=langs, categories=cats)
        db.add(p)
        db.flush()
        platforms[slug] = p

    # Courses — 50 real free courses
    course_defs = [
        # Khan Academy
        ("khan-academy", "Algebra Basics", "https://khanacademy.org/math/algebra-basics",
         "Learn the basics of algebra", "beginner", "video", "en", 10, True, False, ["math", "algebra"], "academic"),
        ("khan-academy", "Biology", "https://khanacademy.org/science/biology",
         "High school and college biology", "intermediate", "video", "en", 40, True, False, ["biology", "science"], "academic"),
        ("khan-academy", "Computer Science Principles", "https://khanacademy.org/computing/ap-computer-science-principles",
         "Intro to CS: internet, data, algorithms", "beginner", "interactive", "en", 30, True, False, ["cs", "programming"], "academic"),
        # Coursera
        ("coursera", "Machine Learning by Andrew Ng", "https://coursera.org/learn/machine-learning",
         "Stanford's famous ML course — neural networks, SVMs, clustering", "intermediate", "video", "en", 60, True, True, ["ai", "machine-learning", "python"], "professional"),
        ("coursera", "Google Data Analytics Certificate", "https://coursera.org/professional-certificates/google-data-analytics",
         "Prepare for a career in data analytics", "beginner", "mixed", "en", 180, False, True, ["data", "analytics", "sql"], "professional"),
        ("coursera", "Python for Everybody", "https://coursera.org/specializations/python",
         "Learn to program in Python from University of Michigan", "beginner", "video", "en", 80, True, True, ["python", "programming"], "professional"),
        # AWS
        ("aws", "AWS Cloud Practitioner Essentials", "https://explore.skillbuilder.aws/learn/course/134/aws-cloud-practitioner-essentials",
         "Foundation-level understanding of AWS Cloud", "beginner", "video", "en", 6, True, True, ["aws", "cloud"], "professional"),
        ("aws", "AWS Solutions Architect Learning Plan", "https://explore.skillbuilder.aws/learn/public/learning_plan/view/1044",
         "Prepare for the AWS Solutions Architect exam", "intermediate", "mixed", "en", 50, True, True, ["aws", "cloud", "architecture"], "professional"),
        # Microsoft
        ("microsoft-learn", "Azure Fundamentals (AZ-900)", "https://learn.microsoft.com/en-us/training/paths/az-900-describe-cloud-concepts/",
         "Learn core Azure concepts and services", "beginner", "text", "en", 10, True, True, ["azure", "cloud"], "professional"),
        ("microsoft-learn", "Power BI Data Analyst", "https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/",
         "Create dashboards and reports with Power BI", "intermediate", "text", "en", 20, True, True, ["data", "power-bi", "analytics"], "professional"),
        # freeCodeCamp
        ("freecodecamp", "Responsive Web Design", "https://freecodecamp.org/learn/2022/responsive-web-design/",
         "HTML, CSS, Flexbox, CSS Grid — build 20 projects", "beginner", "interactive", "en", 300, True, True, ["html", "css", "web"], "professional"),
        ("freecodecamp", "JavaScript Algorithms", "https://freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
         "Learn JavaScript fundamentals and algorithms", "intermediate", "interactive", "en", 300, True, True, ["javascript", "algorithms"], "professional"),
        ("freecodecamp", "Data Analysis with Python", "https://freecodecamp.org/learn/data-analysis-with-python/",
         "NumPy, Pandas, Matplotlib — complete data analysis toolkit", "intermediate", "interactive", "en", 300, True, True, ["python", "data", "pandas"], "professional"),
        # OpenClassrooms
        ("openclassrooms", "Apprenez a creer votre site web avec HTML5 et CSS3", "https://openclassrooms.com/fr/courses/1603881",
         "Le cours de reference pour debuter en HTML/CSS", "beginner", "text", "fr", 20, True, True, ["html", "css", "web"], "professional"),
        ("openclassrooms", "Apprenez a programmer en Python", "https://openclassrooms.com/fr/courses/7168871",
         "Les bases de Python pour debutants", "beginner", "text", "fr", 15, True, True, ["python", "programming"], "professional"),
        # Google
        ("google-skillshop", "Google Analytics Certification", "https://skillshop.withgoogle.com/googleanalytics",
         "Master Google Analytics 4 and earn certification", "intermediate", "video", "en", 5, True, True, ["analytics", "marketing", "google"], "professional"),
        ("google-skillshop", "Google Ads Search Certification", "https://skillshop.withgoogle.com/googleads",
         "Learn to create and optimize Google Ads campaigns", "beginner", "video", "en", 3, True, True, ["ads", "marketing", "google"], "professional"),
        # NVIDIA
        ("nvidia-dli", "Getting Started with Deep Learning", "https://nvidia.com/en-us/training/instructor-led-workshops/fundamentals-of-deep-learning/",
         "Hands-on deep learning with neural networks", "beginner", "mixed", "en", 8, False, True, ["ai", "deep-learning", "gpu"], "professional"),
        # Anthropic
        ("anthropic", "Anthropic API Fundamentals", "https://anthropic.skilljar.com/page/anthropic-api-fundamentals",
         "Learn to build with Claude API — prompting, tools, streaming", "beginner", "mixed", "en", 4, True, True, ["ai", "claude", "api"], "professional"),
        ("anthropic", "Prompt Engineering Interactive Tutorial", "https://anthropic.skilljar.com/page/prompt-engineering-interactive-tutorial",
         "Master prompt engineering techniques for Claude", "intermediate", "interactive", "en", 6, True, True, ["ai", "prompting", "claude"], "professional"),
        # edX
        ("edx", "CS50: Introduction to Computer Science", "https://edx.org/learn/computer-science/harvard-university-cs50-s-introduction-to-computer-science",
         "Harvard's legendary intro to CS — C, Python, SQL, web", "beginner", "video", "en", 100, True, True, ["cs", "programming", "harvard"], "academic"),
        ("edx", "Introduction to Linux", "https://edx.org/learn/linux/the-linux-foundation-introduction-to-linux",
         "Linux Foundation's official intro course", "beginner", "text", "en", 60, True, True, ["linux", "devops", "sysadmin"], "professional"),
        # FUN-MOOC
        ("fun-mooc", "Programmation en Python pour debutants", "https://fun-mooc.fr/fr/cours/apprendre-a-coder-avec-python/",
         "Apprendre Python de zero — cours de l'universite de Montpellier", "beginner", "video", "fr", 30, True, True, ["python", "programming"], "academic"),
        ("fun-mooc", "Introduction a la statistique avec R", "https://fun-mooc.fr/fr/cours/introduction-a-la-statistique-avec-r/",
         "Statistiques et analyse de donnees avec le langage R", "intermediate", "video", "fr", 40, True, True, ["statistics", "r", "data"], "academic"),
        # Codecademy
        ("codecademy", "Learn SQL", "https://codecademy.com/learn/learn-sql",
         "Master SQL for data querying and database management", "beginner", "interactive", "en", 10, True, True, ["sql", "database", "data"], "professional"),
        ("codecademy", "Learn React", "https://codecademy.com/learn/react-101",
         "Build interactive UIs with React and JSX", "intermediate", "interactive", "en", 15, True, True, ["react", "javascript", "web"], "professional"),
        # Duolingo
        ("duolingo", "Learn French", "https://duolingo.com/course/fr/en/Learn-French",
         "French language course — gamified, daily practice", "beginner", "interactive", "en", None, True, False, ["french", "language"], "skills"),
        ("duolingo", "Learn Spanish", "https://duolingo.com/course/es/en/Learn-Spanish",
         "Spanish language course — from zero to conversational", "beginner", "interactive", "en", None, True, False, ["spanish", "language"], "skills"),
        # LinkedIn Learning (not free but well-known)
        ("linkedin-learning", "Learning Python", "https://linkedin.com/learning/learning-python-14393370",
         "Python fundamentals for beginners", "beginner", "video", "en", 3, False, True, ["python", "programming"], "professional"),
        # Udemy (free ones)
        ("udemy", "Python for Beginners", "https://udemy.com/course/pythonforbeginnersintro/",
         "Quick Python intro — variables, loops, functions", "beginner", "video", "en", 2, True, False, ["python", "programming"], "professional"),
        ("udemy", "Git & GitHub Crash Course", "https://udemy.com/course/git-and-github-crash-course/",
         "Learn version control with Git and GitHub", "beginner", "video", "en", 3, True, False, ["git", "github", "devops"], "professional"),
    ]

    for pslug, title, url, desc, diff, fmt, lang, hours, free, cert, tags, cat in course_defs:
        db.add(Course(
            platform_id=platforms[pslug].id, title=title, url=url, description=desc,
            difficulty=diff, format=fmt, language=lang, duration_hours=hours,
            is_free=free, has_certificate=cert, tags=tags, category=cat,
        ))

    db.flush()
    print(f"  Catalog: {len(platform_defs)} platforms, {len(course_defs)} courses")


def main():
    parser = argparse.ArgumentParser(description="Seed Edulia demo sandbox data")
    parser.add_argument("--reset", action="store_true", help="Alias for default behavior (idempotent)")
    parser.parse_args()

    db = SessionLocal()
    try:
        delete_demo_data(db)
        seed_school(db)
        seed_tutoring(db)
        seed_enterprise(db)
        seed_hub_catalog(db)
        db.commit()
        print("\nDemo data seeded successfully!")
        print(f"Login with any demo account using password: demo2026")
    except Exception as e:
        db.rollback()
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
