#!/usr/bin/env python3
"""
Seed 'École Direct' — full end-to-end demo for a parent visiting with their child.

Demonstrates the complete Edulia workflow:
  - Admin (director) / Teacher / Student / Parent
  - PS class (Petite Section, 3-year-olds)
  - Academic year + 3 terms
  - Timetable (weekly sessions)
  - Homework assigned by teacher
  - Assessments + grades
  - Attendance records
  - Teacher ↔ Parent message thread
  - Calendar events
  - School life note
  - Curriculum: gov PS competencies + school learning objectives + content links
    (Lumni, Mathador, Wikisource, YouTube, La Fontaine audio)

Usage:
    python scripts/seed_ecole_direct.py           # seed (idempotent)
    python scripts/seed_ecole_direct.py --reset   # delete and reseed

Logins (all password: demo2026):
    director@ecoledirect.demo.edulia.io   — Admin / Directrice
    claire.fontaine@ecoledirect.demo.edulia.io — Teacher PS
    david.dupont@ecoledirect.demo.edulia.io    — Parent (Emma's father)
    emma.dupont@ecoledirect.demo.edulia.io     — Student (Emma, PS)
"""

import argparse
import os
import sys
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "apps", "api"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import hash_password
from app.db.models import (
    User, UserRole, Role, Relationship,
    Group, GroupMembership,
    Tenant, Campus,
    AcademicYear, Term, Subject, Room,
    Session as TimetableSession,
    AttendanceRecord,
    Assessment, Grade, GradeCategory,
    Homework, Submission,
    Thread, ThreadParticipant, Message,
    CalendarEvent,
    Incident,
)

SLUG = "ecole-direct"
DEMO_PASSWORD = hash_password("demo2026")

engine = create_engine(os.environ["DATABASE_URL"])
SessionLocal = sessionmaker(bind=engine)


# ─── Delete ────────────────────────────────────────────────────────────────────

def delete_existing(db: Session):
    raw = db.get_bind()
    with raw.connect() as c:
        tenant = db.query(Tenant).filter(Tenant.slug == SLUG).first()
        if not tenant:
            print("No existing data to delete.")
            return
        tid = str(tenant.id)
        tables = [
            ("objective_content",  "tenant_id=:t"),
            ("learning_objectives","tenant_id=:t"),
            ("wallet_transactions","wallet_id IN (SELECT id FROM wallets WHERE tenant_id=:t)"),
            ("wallets",            "tenant_id=:t"),
            ("submissions",        "homework_id IN (SELECT id FROM homework WHERE tenant_id=:t)"),
            ("homework",           "tenant_id=:t"),
            ("grades",             "assessment_id IN (SELECT id FROM assessments WHERE tenant_id=:t)"),
            ("assessments",        "tenant_id=:t"),
            ("grade_categories",   "tenant_id=:t"),
            ("attendance_records", "tenant_id=:t"),
            ("session_exceptions", "session_id IN (SELECT id FROM sessions WHERE tenant_id=:t)"),
            ("sessions",           "tenant_id=:t"),
            ("messages",           "thread_id IN (SELECT id FROM threads WHERE tenant_id=:t)"),
            ("thread_participants","thread_id IN (SELECT id FROM threads WHERE tenant_id=:t)"),
            ("threads",            "tenant_id=:t"),
            ("notifications",      "tenant_id=:t"),
            ("incidents",          "tenant_id=:t"),
            ("calendar_events",    "tenant_id=:t"),
            ("form_responses",     "form_id IN (SELECT id FROM forms WHERE tenant_id=:t)"),
            ("form_fields",        "form_id IN (SELECT id FROM forms WHERE tenant_id=:t)"),
            ("forms",              "tenant_id=:t"),
            ("group_memberships",  "group_id IN (SELECT id FROM groups WHERE tenant_id=:t)"),
            ("groups",             "tenant_id=:t"),
            ("relationships",      "tenant_id=:t"),
            ("user_roles",         "user_id IN (SELECT id FROM users WHERE tenant_id=:t)"),
            ("users",              "tenant_id=:t"),
            ("rooms",              "tenant_id=:t"),
            ("subjects",           "tenant_id=:t"),
            ("terms",              "academic_year_id IN (SELECT id FROM academic_years WHERE tenant_id=:t)"),
            ("academic_years",     "tenant_id=:t"),
            ("campuses",           "tenant_id=:t"),
            ("roles",              "tenant_id=:t"),
            ("tenants",            "id=:t"),
        ]
        for table, where in tables:
            try:
                c.execute(text(f"DELETE FROM {table} WHERE {where}"), {"t": tid})
            except Exception:
                pass
        c.commit()
    print(f"Deleted tenant '{SLUG}' and all related data.")


# ─── Helpers ───────────────────────────────────────────────────────────────────

def mk_user(db, tid, email, first, last, role_id):
    u = User(
        tenant_id=tid, email=email, password_hash=DEMO_PASSWORD,
        first_name=first, last_name=last,
        display_name=f"{first} {last}", status="active",
    )
    db.add(u)
    db.flush()
    db.add(UserRole(user_id=u.id, role_id=role_id, scope_type="tenant"))
    db.flush()
    return u


def mk_session(db, tid, year_id, group_id, subject_id, teacher_id, room_id,
               day, start, end):
    h1, m1 = map(int, start.split(":"))
    h2, m2 = map(int, end.split(":"))
    s = TimetableSession(
        tenant_id=tid, academic_year_id=year_id, group_id=group_id,
        subject_id=subject_id, teacher_id=teacher_id, room_id=room_id,
        day_of_week=day, start_time=time(h1, m1), end_time=time(h2, m2),
        recurrence="weekly", status="active",
    )
    db.add(s)
    db.flush()
    return s


# ─── Main seed ─────────────────────────────────────────────────────────────────

def seed(db: Session):
    print("\n=== Seeding École Direct ===\n")

    # ── Tenant ──────────────────────────────────────────────────────────────────
    tenant = Tenant(
        name="École Direct", slug=SLUG, type="school",
        settings={
            "timezone": "Europe/Paris", "locale": "fr", "currency": "EUR",
            "grading_scale": 20,
            "enabled_modules": [
                "timetable", "attendance", "gradebook", "messaging",
                "homework", "documents", "forms", "wallet", "community",
                "calendar", "school_life",
            ],
            "contact_email": "contact@ecoledirect.fr",
            "contact_phone": "+33 1 23 45 67 89",
            "iban": "FR76 3000 6000 0112 3456 7890 189",
            "siret": "123 456 789 00001",
            "address": "15 avenue des Marronniers, 75015 Paris",
        },
    )
    db.add(tenant)
    db.flush()
    tid = tenant.id
    print(f"  Tenant: {tenant.name} ({tid})")

    # ── Campus ───────────────────────────────────────────────────────────────────
    campus = Campus(
        tenant_id=tid, name="Site principal", is_default=True,
        address={"street": "15 avenue des Marronniers", "city": "Paris", "zip": "75015"},
    )
    db.add(campus)
    db.flush()

    # ── Roles ────────────────────────────────────────────────────────────────────
    roles = {}
    role_defs = [
        ("admin",   "Administrateur", ["admin.user.create", "admin.user.edit", "admin.user.view",
            "admin.tenant.edit", "admin.role.manage", "gradebook.grade.create",
            "attendance.record.create", "messaging.thread.send"]),
        ("teacher", "Enseignant",     ["gradebook.grade.create", "gradebook.grade.edit",
            "attendance.record.create", "messaging.thread.send", "homework.create"]),
        ("student", "Élève",          ["gradebook.grade.view", "messaging.thread.send", "homework.submit"]),
        ("parent",  "Parent",         ["gradebook.grade.view", "attendance.record.view", "messaging.thread.send"]),
    ]
    for code, display, perms in role_defs:
        r = Role(tenant_id=tid, code=code, display_name=display, is_system=True, permissions=perms)
        db.add(r)
        db.flush()
        roles[code] = r
    print(f"  Roles: {list(roles.keys())}")

    # ── Academic year + terms ────────────────────────────────────────────────────
    year = AcademicYear(
        tenant_id=tid, name="2025-2026",
        start_date=date(2025, 9, 1), end_date=date(2026, 7, 4), is_current=True,
    )
    db.add(year)
    db.flush()

    terms = []
    for name, start, end, order in [
        ("Trimestre 1", date(2025, 9, 1),  date(2025, 12, 20), 1),
        ("Trimestre 2", date(2026, 1, 5),  date(2026, 3, 28),  2),
        ("Trimestre 3", date(2026, 3, 31), date(2026, 7, 4),   3),
    ]:
        t = Term(academic_year_id=year.id, name=name, start_date=start, end_date=end, order=order)
        db.add(t)
        db.flush()
        terms.append(t)
    print(f"  Academic year: {year.name} — {len(terms)} terms")

    # ── Subjects (PS domains matching the 5 curriculum domains) ─────────────────
    subjects = {}
    subj_defs = [
        ("LANG",   "Langage",                    "#9B59B6", 2),  # LANGAGE domain
        ("MATHS",  "Mathématiques",               "#3498DB", 2),  # MATHS domain
        ("MOT",    "Activités physiques",         "#27AE60", 1),  # PHYSIQUE domain
        ("ARTS",   "Activités artistiques",       "#E74C3C", 1),  # ARTISTIQUE domain
        ("MONDE",  "Découverte du monde",         "#F39C12", 1),  # MONDE domain
    ]
    for code, name, color, coef in subj_defs:
        s = Subject(tenant_id=tid, code=code, name=name, color=color, coefficient=coef)
        db.add(s)
        db.flush()
        subjects[code] = s
    print(f"  Subjects: {list(subjects.keys())}")

    # ── Rooms ─────────────────────────────────────────────────────────────────────
    rooms = {}
    for name, cap in [("Salle PS", 25), ("Salle de motricité", 30), ("Salle des arts", 20)]:
        r = Room(tenant_id=tid, campus_id=campus.id, name=name, capacity=cap)
        db.add(r)
        db.flush()
        rooms[name] = r

    # ── Admin — Isabelle Leblanc (directrice) ────────────────────────────────────
    admin = mk_user(db, tid, "director@ecoledirect.demo.edulia.io",
                    "Isabelle", "Leblanc", roles["admin"].id)
    print(f"  Admin: Isabelle Leblanc ({admin.id})")

    # ── Teacher — Claire Fontaine (PS class teacher) ──────────────────────────────
    teacher = mk_user(db, tid, "claire.fontaine@ecoledirect.demo.edulia.io",
                      "Claire", "Fontaine", roles["teacher"].id)
    print(f"  Teacher: Claire Fontaine ({teacher.id})")

    # ── Student — Emma Dupont (Petite Section, age 3) ─────────────────────────────
    student = mk_user(db, tid, "emma.dupont@ecoledirect.demo.edulia.io",
                      "Emma", "Dupont", roles["student"].id)
    print(f"  Student: Emma Dupont ({student.id})")

    # ── Parent — David Dupont (Emma's father) ─────────────────────────────────────
    parent = mk_user(db, tid, "david.dupont@ecoledirect.demo.edulia.io",
                     "David", "Dupont", roles["parent"].id)
    print(f"  Parent: David Dupont ({parent.id})")

    # Parent → child relationship
    db.add(Relationship(
        tenant_id=tid, from_user_id=parent.id, to_user_id=student.id,
        type="guardian", is_primary=True,
    ))
    db.flush()

    # ── Class — Petite Section ───────────────────────────────────────────────────
    ps_class = Group(
        tenant_id=tid, campus_id=campus.id, academic_year_id=year.id,
        type="class", name="Petite Section", capacity=25,
    )
    db.add(ps_class)
    db.flush()

    # Teacher → class membership
    db.add(GroupMembership(
        group_id=ps_class.id, user_id=teacher.id,
        role_in_group="teacher", joined_at=datetime.utcnow(),
    ))
    # Emma → class membership
    db.add(GroupMembership(
        group_id=ps_class.id, user_id=student.id,
        role_in_group="member", joined_at=datetime.utcnow(),
    ))
    # Also add 4 more anonymous students so class isn't empty
    for i, (fn, ln) in enumerate([("Lucas", "Martin"), ("Zoé", "Bernard"),
                                   ("Noah", "Petit"), ("Léa", "Rousseau")]):
        u = User(
            tenant_id=tid,
            email=f"s{i+2}.ps@ecoledirect.demo.edulia.io",
            password_hash=DEMO_PASSWORD,
            first_name=fn, last_name=ln,
            display_name=f"{fn} {ln}", status="active",
        )
        db.add(u)
        db.flush()
        db.add(UserRole(user_id=u.id, role_id=roles["student"].id, scope_type="tenant"))
        db.add(GroupMembership(
            group_id=ps_class.id, user_id=u.id,
            role_in_group="member", joined_at=datetime.utcnow(),
        ))
    db.flush()
    print(f"  Class: Petite Section ({ps_class.id}) — Emma + 4 classmates")

    # ── Timetable ────────────────────────────────────────────────────────────────
    # Maternelle: Mon–Fri, 4 sessions/day (no Wed afternoon in French PS)
    timetable_def = [
        # (day, start, end, subject, room)
        (0, "08:30", "09:30", "LANG",  "Salle PS"),
        (0, "09:30", "10:30", "MATHS", "Salle PS"),
        (0, "10:45", "11:45", "MOT",   "Salle de motricité"),
        (0, "13:30", "14:30", "MONDE", "Salle PS"),
        (0, "14:30", "15:30", "ARTS",  "Salle des arts"),

        (1, "08:30", "09:30", "MATHS", "Salle PS"),
        (1, "09:30", "10:30", "LANG",  "Salle PS"),
        (1, "10:45", "11:45", "ARTS",  "Salle des arts"),
        (1, "13:30", "14:30", "LANG",  "Salle PS"),
        (1, "14:30", "15:30", "MOT",   "Salle de motricité"),

        (2, "08:30", "09:30", "LANG",  "Salle PS"),  # Wednesday morning only
        (2, "09:30", "10:30", "MATHS", "Salle PS"),
        (2, "10:45", "11:45", "MONDE", "Salle PS"),

        (3, "08:30", "09:30", "ARTS",  "Salle des arts"),
        (3, "09:30", "10:30", "MATHS", "Salle PS"),
        (3, "10:45", "11:45", "LANG",  "Salle PS"),
        (3, "13:30", "14:30", "MOT",   "Salle de motricité"),
        (3, "14:30", "15:30", "MONDE", "Salle PS"),

        (4, "08:30", "09:30", "LANG",  "Salle PS"),
        (4, "09:30", "10:30", "ARTS",  "Salle des arts"),
        (4, "10:45", "11:45", "MATHS", "Salle PS"),
        (4, "13:30", "14:30", "MONDE", "Salle PS"),
        (4, "14:30", "15:30", "MOT",   "Salle de motricité"),
    ]
    sessions = []
    for day, start, end, subj, room in timetable_def:
        s = mk_session(db, tid, year.id, ps_class.id,
                       subjects[subj].id, teacher.id, rooms[room].id,
                       day, start, end)
        sessions.append((day, subj, s))
    print(f"  Timetable: {len(sessions)} weekly sessions")

    # ── Attendance ───────────────────────────────────────────────────────────────
    # 3 weeks of attendance — week of Oct 13, Oct 20, Nov 3 2025
    weeks = [date(2025, 10, 13), date(2025, 10, 20), date(2025, 11, 3)]
    for week_start in weeks:
        for day, subj, sess in sessions:
            session_date = week_start + timedelta(days=day)
            # Emma: one Monday absent (doctor), one Thursday late
            if week_start == date(2025, 10, 13) and day == 0:
                status, late, reason, justified = "absent", None, "Rendez-vous médical", True
            elif week_start == date(2025, 10, 20) and day == 3 and subj == "ARTS":
                status, late, reason, justified = "late", 10, None, False
            else:
                status, late, reason, justified = "present", None, None, False
            db.add(AttendanceRecord(
                tenant_id=tid, session_id=sess.id, student_id=student.id,
                date=session_date, status=status, late_minutes=late,
                reason=reason, justified=justified, recorded_by=teacher.id,
            ))
    db.flush()
    print(f"  Attendance: {len(sessions) * len(weeks)} records — 1 absent, 1 late")

    # ── Gradebook ────────────────────────────────────────────────────────────────
    t1 = terms[0]  # Trimestre 1
    t2 = terms[1]  # Trimestre 2

    # In maternelle, assessments are skills-based (we use /4 scale for simplicity)
    cat_lang = GradeCategory(tenant_id=tid, subject_id=subjects["LANG"].id,
                              group_id=ps_class.id, term_id=t1.id,
                              name="Compétences orales", weight=Decimal("2"))
    cat_math = GradeCategory(tenant_id=tid, subject_id=subjects["MATHS"].id,
                              group_id=ps_class.id, term_id=t1.id,
                              name="Découverte des nombres", weight=Decimal("2"))
    db.add(cat_lang)
    db.add(cat_math)
    db.flush()

    assess_defs = [
        (subjects["LANG"].id,  cat_lang.id, "Reconnaître son prénom écrit", date(2025, 10, 8),  4, 1, t1.id),
        (subjects["LANG"].id,  cat_lang.id, "Réciter une comptine",         date(2025, 11, 5),  4, 1, t1.id),
        (subjects["MATHS"].id, cat_math.id, "Compter jusqu'à 5",            date(2025, 10, 15), 4, 1, t1.id),
        (subjects["MATHS"].id, cat_math.id, "Reconnaître les formes",       date(2025, 11, 12), 4, 1, t1.id),
        (subjects["LANG"].id,  cat_lang.id, "Raconter une histoire",        date(2026, 1, 20),  4, 2, t2.id),
        (subjects["MATHS"].id, cat_math.id, "Compter jusqu'à 10",           date(2026, 2, 10),  4, 2, t2.id),
    ]
    assessments = []
    for subj_id, cat_id, title, dt, max_score, coeff, term_id in assess_defs:
        a = Assessment(
            tenant_id=tid, subject_id=subj_id, group_id=ps_class.id, term_id=term_id,
            category_id=cat_id, teacher_id=teacher.id, title=title,
            date=dt, max_score=max_score, coefficient=Decimal(str(coeff)), is_published=True,
        )
        db.add(a)
        db.flush()
        assessments.append(a)

    # Emma's grades — she's doing well
    emma_scores = [4, 3, 3, 4, 4, 4]
    emma_comments = [
        "Très bien — reconnaît son prénom depuis la rentrée",
        "A appris la comptine très vite, la récite avec enthousiasme",
        "Compte jusqu'à 5 avec les doigts, en progression",
        "Excellent — distingue carrés, ronds et triangles",
        "Raconte avec plaisir, vocabulaire en développement",
        "Compte jusqu'à 10 — objectif atteint en avance",
    ]
    for i, (score, comment) in enumerate(zip(emma_scores, emma_comments)):
        db.add(Grade(
            assessment_id=assessments[i].id, student_id=student.id,
            score=Decimal(str(score)), comment=comment,
        ))
    db.flush()
    print(f"  Gradebook: {len(assessments)} assessments — Emma graded")

    # ── Homework ──────────────────────────────────────────────────────────────────
    homework_defs = [
        (subjects["LANG"].id,  "Apprendre la comptine 'Un, deux, trois'",
         "Écouter et répéter la comptine avec vos parents. Fichier audio disponible sur Lumni.",
         date(2025, 10, 6), date(2025, 10, 13)),
        (subjects["MATHS"].id, "Compter les objets à la maison",
         "Compter avec votre enfant les cuillères, les chaussures, les jouets — jusqu'à 5 minimum.",
         date(2025, 10, 13), date(2025, 10, 20)),
        (subjects["ARTS"].id,  "Dessiner ma famille",
         "Demandez à Emma de dessiner sa famille. Apportez le dessin en classe.",
         date(2025, 10, 20), date(2025, 10, 27)),
        (subjects["LANG"].id,  "Apprendre la fable 'La Cigale et la Fourmi' (2 premiers vers)",
         "Écouter l'audio sur litteratureaudio.com avec votre enfant. Apprendre les 2 premiers vers.",
         date(2026, 1, 12), date(2026, 1, 19)),
        (subjects["MATHS"].id, "Jeu Mathador à la maison",
         "Jouer 10 minutes à mathador.fr/solo.html avec votre enfant — niveau débutant.",
         date(2026, 2, 2), date(2026, 2, 9)),
    ]
    homework_list = []
    for subj_id, title, desc, assigned, due in homework_defs:
        h = Homework(
            tenant_id=tid, group_id=ps_class.id, teacher_id=teacher.id,
            subject_id=subj_id, title=title, description=desc,
            assigned_date=assigned, due_date=due, allow_submission=True,
        )
        db.add(h)
        db.flush()
        homework_list.append(h)

    # Emma has submitted the first 3 homeworks
    for i, h in enumerate(homework_list[:3]):
        db.add(Submission(
            homework_id=h.id, student_id=student.id,
            content="Devoir remis par Emma — validé par la maîtresse",
            submitted_at=datetime.combine(h.due_date - timedelta(days=1), time(18, 0)),
            status="graded",
            teacher_feedback="Excellent travail ! Emma a bien travaillé à la maison." if i == 0 else "Bien fait !",
            grade=Decimal("4"),
        ))
    db.flush()
    print(f"  Homework: {len(homework_list)} assignments — 3 submitted by Emma")

    # ── Messages ──────────────────────────────────────────────────────────────────
    # Thread: Claire Fontaine (teacher) ↔ David Dupont (parent)
    thread = Thread(
        tenant_id=tid,
        subject="Bienvenue en Petite Section — Emma Dupont",
        type="direct",
        created_by=teacher.id,
    )
    db.add(thread)
    db.flush()
    db.add(ThreadParticipant(thread_id=thread.id, user_id=teacher.id, role="sender"))
    db.add(ThreadParticipant(thread_id=thread.id, user_id=parent.id, role="recipient"))
    db.flush()

    messages_def = [
        (teacher.id, date(2025, 9, 3),
         "Bonjour Monsieur Dupont,\n\nJe suis ravie d'accueillir Emma dans ma classe de Petite Section cette année ! "
         "Elle s'est très bien adaptée à la rentrée — elle joue déjà avec ses camarades et participe aux activités.\n\n"
         "Pour toute question, n'hésitez pas à me contacter ici.\n\nCordialement,\nClaire Fontaine"),
        (parent.id, date(2025, 9, 4),
         "Bonjour Maîtresse,\n\nMerci pour ce message rassurant ! Emma parle beaucoup de vous à la maison, elle est très contente.\n\n"
         "Une petite question : pouvez-vous me recommander des ressources pour continuer à travailler les chiffres avec elle à la maison ?\n\nCordialement,\nDavid Dupont"),
        (teacher.id, date(2025, 9, 5),
         "Bonjour Monsieur Dupont,\n\nAvec plaisir ! Voici quelques ressources gratuites que j'utilise aussi en classe :\n\n"
         "📺 Lumni (lumni.fr) — vidéos éducatives pour la maternelle, section 'Maternelle'\n"
         "🎮 Mathador (mathador.fr/solo.html) — jeux de calcul mental, parfait pour son âge\n"
         "🎵 Lumni Comptines — pour apprendre à compter en chanson\n\n"
         "20 minutes par jour suffisent — et surtout faites-le ensemble, c'est plus efficace !\n\nBonne journée,\nClaire Fontaine"),
        (parent.id, date(2025, 10, 14),
         "Bonjour Maîtresse,\n\nJe voulais vous signaler qu'Emma était absente ce matin pour un rendez-vous chez le médecin. "
         "Elle sera là cet après-midi.\n\nCdt, David Dupont"),
        (teacher.id, date(2025, 10, 14),
         "Bonjour,\n\nMerci pour le message — j'ai bien noté son absence du matin. Emma a rattrapé sans problème. "
         "Bonne nouvelle : elle a récité la comptine devant la classe aujourd'hui, elle était très fière d'elle !\n\nBonne journée,\nClaire Fontaine"),
        (teacher.id, date(2026, 1, 10),
         "Bonjour Monsieur Dupont,\n\nNous allons travailler sur les fables de La Fontaine ce trimestre — un classique du programme de maternelle. "
         "J'ai assigné un devoir à la maison : écouter 'La Cigale et la Fourmi' avec Emma et apprendre les 2 premiers vers.\n\n"
         "Vous trouverez une version audio gratuite sur litteratureaudio.com, et une version animée pour enfants sur YouTube (chaîne 'Les P'tits z'Amis').\n\n"
         "Le programme scolaire complet d'Emma est visible depuis votre espace parent → 'Programme scolaire'.\n\nBonne semaine,\nClaire Fontaine"),
    ]
    for sender_id, msg_date, body in messages_def:
        db.add(Message(
            thread_id=thread.id, sender_id=sender_id,
            body=body,
            created_at=datetime.combine(msg_date, time(9, 0)),
        ))
    db.flush()
    print(f"  Messages: {len(messages_def)} messages in teacher↔parent thread")

    # ── Calendar events ───────────────────────────────────────────────────────────
    calendar_defs = [
        ("Réunion de rentrée — Parents PS/MS", date(2025, 9, 10), date(2025, 9, 10),
         "Présentation du programme et de l'équipe pédagogique. 18h00 en salle polyvalente.",
         "meeting", "#4A90D9"),
        ("Vacances Toussaint", date(2025, 10, 18), date(2025, 11, 3),
         "Vacances scolaires — Toussaint 2025.", "holiday", "#95A5A6"),
        ("Fête de Noël de l'école", date(2025, 12, 17), date(2025, 12, 17),
         "Spectacle préparé par les enfants. Les familles sont invitées à 15h00.", "event", "#E74C3C"),
        ("Vacances de Noël", date(2025, 12, 20), date(2026, 1, 4),
         "Vacances scolaires — Noël 2025/2026.", "holiday", "#95A5A6"),
        ("Carnaval de l'école", date(2026, 2, 24), date(2026, 2, 24),
         "Déguisements encouragés ! Parade dans la cour à 10h00.", "event", "#E67E22"),
        ("Portes ouvertes", date(2026, 3, 14), date(2026, 3, 14),
         "Venez découvrir l'école avec votre enfant. 9h-12h.", "event", "#27AE60"),
    ]
    for title, start, end, desc, etype, color in calendar_defs:
        db.add(CalendarEvent(
            tenant_id=tid, title=title,
            start_at=datetime.combine(start, time(8, 0)),
            end_at=datetime.combine(end, time(18, 0)),
            description=desc, event_type=etype, color=color,
            created_by=admin.id,
        ))
    db.flush()
    print(f"  Calendar: {len(calendar_defs)} events")

    # ── School life ───────────────────────────────────────────────────────────────
    db.add(Incident(
        tenant_id=tid, student_id=student.id,
        incident_type="behavior", severity="low",
        description="Comportement exemplaire : Emma a aidé un camarade qui avait du mal à ranger ses affaires. Très belle initiative !",
        action_taken="Félicitations communiquées aux parents.",
        reported_by=teacher.id,
        status="resolved",
    ))
    db.add(Incident(
        tenant_id=tid, student_id=student.id,
        incident_type="behavior", severity="low",
        description="Agitation pendant la sieste — Emma a eu du mal à se calmer. Situation passagère, pas d'inquiétude.",
        action_taken="Discussion calme avec Emma. Pas de récidive.",
        reported_by=teacher.id,
        status="resolved",
    ))
    db.flush()
    print("  School life: 2 events (1 positive, 1 incident)")

    # ── Curriculum: learning objectives + content ─────────────────────────────────
    # Commit first so raw SQL inserts can see the tenant FK
    db.commit()

    # Find PS competencies from the globally seeded curriculum
    comps = db.execute(text("""
        SELECT cc.id, cc.description, cd.code as domain_code
        FROM curriculum_competencies cc
        JOIN curriculum_domains cd ON cd.id = cc.domain_id
        JOIN curriculum_frameworks cf ON cf.id = cd.framework_id
        WHERE cf.cycle = '1'
        ORDER BY cd.sort_order, cc.sort_order
    """)).fetchall()

    if not comps:
        print("  WARNING: No curriculum data found — run seed_curriculum.py first!")
        print("  Skipping learning objectives.")
    else:
        print(f"  Found {len(comps)} PS competencies in DB")

        # We'll map 12 specific competencies to school objectives
        # Pick competencies by matching keyword in description
        def find_comp(keyword, domain=None):
            for c in comps:
                if keyword.lower() in c[1].lower():
                    if domain is None or domain == c[2]:
                        return c[0]
            return comps[0][0]  # fallback to first

        # 12 learning objectives for PS class
        objectives_def = [
            # (competency_keyword, domain, term_idx, week_from, week_to, notes, status, content_links)
            (
                "Communiquer avec les adultes", "LANGAGE", 0, 1, 4,
                "Activités de regroupement matin — chaque enfant s'exprime sur son week-end",
                "completed",
                [
                    ("external_url", "https://www.lumni.fr/video/compter-jusqu-a-10",
                     "Lumni — Compter jusqu'à 10 (vidéo)"),
                    ("external_url", "https://jeux.lumni.fr",
                     "Jeux Lumni — Maternelle"),
                ],
            ),
            (
                "Dire de mémoire et de manière expressive", "LANGAGE", 0, 3, 6,
                "Comptines et poésies courtes — 2 à 3 comptines par trimestre",
                "completed",
                [
                    ("external_url", "https://www.lumni.fr/dossier/comptines-et-chansons",
                     "Lumni — Comptines et chansons"),
                    ("audio", "https://www.litteratureaudio.com/livre-audio-gratuit-mp3/jean-de-la-fontaine-110-fables.html",
                     "Littératureaudio — La Fontaine (110 fables, gratuit)"),
                ],
            ),
            (
                "S'exprimer dans un langage", "LANGAGE", 1, 7, 10,
                "Ateliers de langage — décrire une image, raconter une histoire",
                "in_progress",
                [
                    ("external_url", "https://maitrelucas.fr",
                     "Maître Lucas — vidéos éducatives CP-CM2"),
                ],
            ),
            (
                "Mémoriser les comptines", "LANGAGE", 1, 8, 12,
                "La Cigale et la Fourmi — 2 premiers vers mémorisés en T2",
                "planned",
                [
                    ("external_url", "https://fr.wikisource.org/wiki/Fables_de_La_Fontaine",
                     "Wikisource — Fables de La Fontaine (textes complets, domaine public)"),
                    ("youtube_embed", "https://www.youtube.com/results?search_query=la+cigale+et+la+fourmi+enfants+animation",
                     "YouTube — Les P'tits z'Amis : fables animées pour enfants"),
                    ("audio", "https://www.litteratureaudio.com/livre-audio-gratuit-mp3/jean-de-la-fontaine-110-fables.html",
                     "Littératureaudio — La Fontaine (audio gratuit)"),
                    ("game", "https://www.lafontaine.net/autour-de-lf/",
                     "lafontaine.net — Jeux : La Fable mystère, jeu des morales"),
                ],
            ),
            (
                "Dire la suite des nombres", "MATHS", 0, 2, 5,
                "Comptines numériques — 1 à 5 en T1, 1 à 10 en T2",
                "completed",
                [
                    ("external_url", "https://www.lumni.fr/video/compter-jusqu-a-10",
                     "Lumni — Compter jusqu'à 10"),
                    ("game", "https://www.mathador.fr/solo.html",
                     "Mathador Solo — jeu de calcul mental (gratuit)"),
                ],
            ),
            (
                "Constituer une collection", "MATHS", 0, 4, 8,
                "Activités de dénombrement avec des objets concrets (cubes, perles)",
                "completed",
                [
                    ("game", "https://jeux.lumni.fr",
                     "Jeux Lumni — Mathématiques Maternelle"),
                    ("external_url", "https://fr.khanacademy.org",
                     "Khan Academy — Maths primaire"),
                ],
            ),
            (
                "Comparer des collections", "MATHS", 1, 9, 13,
                "Plus que / moins que — avec des collections d'objets",
                "in_progress",
                [
                    ("game", "https://www.mathador.fr/solo.html",
                     "Mathador Junior — calcul mental"),
                ],
            ),
            (
                "Reconnaître des formes", "MATHS", 0, 5, 7,
                "Identifier cercle, carré, triangle, rectangle",
                "completed",
                [
                    ("external_url", "https://www.lumni.fr",
                     "Lumni — Géométrie maternelle"),
                ],
            ),
            (
                "Se déplacer", "PHYSIQUE", 0, 1, 10,
                "Motricité globale — parcours en salle de motricité 2x/semaine",
                "in_progress",
                [],
            ),
            (
                "Choisir différents outils", "ARTISTIQUE", 0, 3, 9,
                "Dessin, peinture, collage — un support différent chaque semaine",
                "in_progress",
                [
                    ("external_url", "https://www.lumni.fr/dossier/arts-visuels",
                     "Lumni — Arts visuels maternelle"),
                ],
            ),
            (
                "Découvrir les animaux", "MONDE", 0, 6, 9,
                "Observation du monde vivant — les animaux de la ferme, puis de la forêt",
                "completed",
                [
                    ("external_url", "https://www.lumni.fr/video/les-parties-du-corps",
                     "Lumni — Le corps humain"),
                    ("external_url", "https://www.reseau-canope.fr",
                     "Réseau Canopé — Les Fondamentaux (vidéos officielles Ministère)"),
                ],
            ),
            (
                "Identifier les principales caractéristiques", "MONDE", 1, 10, 14,
                "Les saisons — automne et hiver observés dans la cour",
                "planned",
                [],
            ),
        ]

        for (kw, domain, term_idx, wfrom, wto, notes, status, content_links) in objectives_def:
            comp_id = find_comp(kw, domain)
            term_id = terms[term_idx].id

            # Insert learning_objective
            obj_id = uuid.uuid4()
            db.execute(text("""
                INSERT INTO learning_objectives
                    (id, tenant_id, competency_id, term_id, week_from, week_to,
                     group_id, notes, status, created_at, updated_at)
                VALUES
                    (:id, :tid, :cid, :term_id, :wf, :wt,
                     :gid, :notes, :status, :now, :now)
                ON CONFLICT DO NOTHING
            """), {
                "id": str(obj_id), "tid": str(tid), "cid": str(comp_id),
                "term_id": str(term_id), "wf": wfrom, "wt": wto,
                "gid": str(ps_class.id), "notes": notes, "status": status,
                "now": datetime.utcnow().isoformat(),
            })

            for ctype, cref, label in content_links:
                db.execute(text("""
                    INSERT INTO objective_content
                        (id, tenant_id, objective_id, content_type, content_ref, label, created_at)
                    VALUES
                        (:id, :tid, :oid, :ct, :cr, :label, :now)
                    ON CONFLICT DO NOTHING
                """), {
                    "id": str(uuid.uuid4()), "tid": str(tid), "oid": str(obj_id),
                    "ct": ctype, "cr": cref, "label": label,
                    "now": datetime.utcnow().isoformat(),
                })

        total_links = sum(len(c[7]) for c in objectives_def)
        print(f"  Curriculum: {len(objectives_def)} learning objectives, {total_links} content links")

    # ── Done ─────────────────────────────────────────────────────────────────────
    db.commit()  # commit learning objectives + content links
    print("\n" + "="*60)
    print("ÉCOLE DIRECT — SEED COMPLETE")
    print("="*60)
    print()
    print("  Logins (password: demo2026)")
    print("  ─────────────────────────────────────────────────────────")
    print("  👩‍💼 Directrice:  director@ecoledirect.demo.edulia.io")
    print("  👩‍🏫 Enseignante: claire.fontaine@ecoledirect.demo.edulia.io")
    print("  👨 Parent:      david.dupont@ecoledirect.demo.edulia.io")
    print("  👧 Élève:       emma.dupont@ecoledirect.demo.edulia.io")
    print()
    print("  What to explore:")
    print("  ─────────────────────────────────────────────────────────")
    print("  Parent  → /children → Emma → Programme scolaire")
    print("           → Voir 12 objectifs PS + ressources Lumni, La Fontaine, Mathador")
    print("  Parent  → /messages → thread avec Claire Fontaine")
    print("  Parent  → /homework → 5 devoirs dont La Cigale et la Fourmi")
    print("  Parent  → /absences → Emma absente lundi 13 oct (médecin)")
    print()
    print("  Teacher → /attendance → appel Petite Section")
    print("  Teacher → /gradebook → 6 évaluations PS, notes Emma")
    print("  Teacher → /homework → 5 devoirs, 3 soumissions d'Emma")
    print("  Teacher → /timetable → 22 sessions/semaine")
    print()
    print("  Admin   → /dashboard → stats école")
    print("  Admin   → /calendar → 6 événements (réunion, fêtes, vacances)")
    print("  Admin   → /school-life → note positive + incident Emma")
    print()


# ─── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed École Direct demo")
    parser.add_argument("--reset", action="store_true", help="Delete existing data before seeding")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        # Check if tenant exists
        existing = db.query(Tenant).filter(Tenant.slug == SLUG).first()
        if existing:
            if args.reset:
                delete_existing(db)
            else:
                print(f"Tenant '{SLUG}' already exists. Use --reset to reseed.")
                sys.exit(0)
        seed(db)
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
