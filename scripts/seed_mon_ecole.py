#!/usr/bin/env python3
"""Seed 'Mon Ecole' tenant (UUID known) with director, teachers, classes, students."""

import os
import sys
import uuid
from datetime import datetime

# Use tenant UUID directly to avoid encoding issues with accented chars
TENANT_ID = uuid.UUID("63df01cd-041a-4b20-b263-0f739672410c")

sys.path.insert(0, "/opt/edulia/backend/apps/api")
os.chdir("/opt/edulia/backend/apps/api")

from dotenv import load_dotenv
load_dotenv("/opt/edulia/backend/.env")

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db: Session = SessionLocal()

from app.db.models.user import User, UserRole, Role
from app.db.models.group import Group, GroupMembership
from app.core.security import hash_password as get_password_hash

tid = TENANT_ID

# 1. Rename admin user to Marie Dupont
admin = db.query(User).filter(User.tenant_id == tid, User.email == "admin@edulia.angelstreet.io").first()
if admin:
    admin.first_name = "Marie"
    admin.last_name = "Dupont"
    admin.display_name = "Marie Dupont"
    print(f"  Updated admin -> Marie Dupont ({admin.id})")
else:
    print("  ERROR: admin user not found")
    sys.exit(1)

# 2. Get role records
roles = {r.code: r for r in db.query(Role).filter(Role.tenant_id == tid).all()}
print(f"  Roles found: {list(roles.keys())}")

if "teacher" not in roles:
    teacher_role = Role(id=uuid.uuid4(), tenant_id=tid, code="teacher", display_name="Teacher")
    db.add(teacher_role)
    db.flush()
    roles["teacher"] = teacher_role
    print("  Created teacher role")

if "student" not in roles:
    student_role = Role(id=uuid.uuid4(), tenant_id=tid, code="student", display_name="Student")
    db.add(student_role)
    db.flush()
    roles["student"] = student_role
    print("  Created student role")

# 3. Create 3 classes (flat, no level hierarchy — shows under 'Other' in org chart)
class_names = ["CE2 A", "CM1 A", "CM2 A"]
classes = {}
for cn in class_names:
    g = db.query(Group).filter(Group.tenant_id == tid, Group.name == cn, Group.type == "class").first()
    if not g:
        g = Group(
            id=uuid.uuid4(),
            tenant_id=tid,
            name=cn,
            type="class",
        )
        db.add(g)
        db.flush()
        print(f"  Created class: {cn}")
    else:
        print(f"  Using class: {cn}")
    classes[cn] = g

# 5. Create 4 teachers
teacher_data = [
    ("Sophie", "Martin", "sophie.martin@ecole.fr"),
    ("Paul", "Bernard", "paul.bernard@ecole.fr"),
    ("Claire", "Petit", "claire.petit@ecole.fr"),
    ("Thomas", "Roux", "thomas.roux@ecole.fr"),
]
teachers = {}
for first, last, email in teacher_data:
    u = db.query(User).filter(User.tenant_id == tid, User.email == email).first()
    if not u:
        u = User(
            id=uuid.uuid4(),
            tenant_id=tid,
            email=email,
            first_name=first,
            last_name=last,
            display_name=f"{first} {last}",
            password_hash=get_password_hash("demo2026"),
            status="active",
        )
        db.add(u)
        db.flush()
        db.add(UserRole(id=uuid.uuid4(), user_id=u.id, role_id=roles["teacher"].id))
        print(f"  Created teacher: {first} {last}")
    else:
        print(f"  Using teacher: {first} {last}")
    teachers[email] = u

# 6. Assign teachers to classes
teacher_class_map = [
    ("sophie.martin@ecole.fr", "CE2 A"),
    ("sophie.martin@ecole.fr", "CM1 A"),
    ("paul.bernard@ecole.fr", "CE2 A"),
    ("paul.bernard@ecole.fr", "CM1 A"),
    ("claire.petit@ecole.fr", "CM1 A"),
    ("claire.petit@ecole.fr", "CM2 A"),
    ("thomas.roux@ecole.fr", "CM1 A"),
    ("thomas.roux@ecole.fr", "CM2 A"),
]
for email, cls_name in teacher_class_map:
    t = teachers[email]
    g = classes[cls_name]
    exists = db.query(GroupMembership).filter(
        GroupMembership.group_id == g.id,
        GroupMembership.user_id == t.id,
        GroupMembership.left_at.is_(None),
    ).first()
    if not exists:
        db.add(GroupMembership(
            id=uuid.uuid4(),
            group_id=g.id,
            user_id=t.id,
            role_in_group="teacher",
            joined_at=datetime.utcnow(),
        ))
        print(f"  Added {email} -> {cls_name}")

# 7. Create 9 students (3 per class)
student_data = {
    "CE2 A": [
        ("Lucas", "Moreau", "lucas.moreau@ecole.fr"),
        ("Emma", "Lefevre", "emma.lefevre@ecole.fr"),
        ("Noah", "Garcia", "noah.garcia@ecole.fr"),
    ],
    "CM1 A": [
        ("Lea", "Martinez", "lea.martinez@ecole.fr"),
        ("Hugo", "Dubois", "hugo.dubois@ecole.fr"),
        ("Chloe", "Simon", "chloe.simon@ecole.fr"),
    ],
    "CM2 A": [
        ("Tom", "Laurent", "tom.laurent@ecole.fr"),
        ("Jade", "Michel", "jade.michel@ecole.fr"),
        ("Liam", "Fontaine", "liam.fontaine@ecole.fr"),
    ],
}
for cls_name, students in student_data.items():
    g = classes[cls_name]
    for first, last, email in students:
        u = db.query(User).filter(User.tenant_id == tid, User.email == email).first()
        if not u:
            u = User(
                id=uuid.uuid4(),
                tenant_id=tid,
                email=email,
                first_name=first,
                last_name=last,
                display_name=f"{first} {last}",
                password_hash=get_password_hash("demo2026"),
                status="active",
            )
            db.add(u)
            db.flush()
            db.add(UserRole(id=uuid.uuid4(), user_id=u.id, role_id=roles["student"].id))
            print(f"  Created student: {first} {last}")
        else:
            print(f"  Using student: {first} {last}")
        exists = db.query(GroupMembership).filter(
            GroupMembership.group_id == g.id,
            GroupMembership.user_id == u.id,
            GroupMembership.left_at.is_(None),
        ).first()
        if not exists:
            db.add(GroupMembership(
                id=uuid.uuid4(),
                group_id=g.id,
                user_id=u.id,
                role_in_group="member",
                joined_at=datetime.utcnow(),
            ))

# 8. Commit
db.commit()
print("\nDone! Seeded successfully.")
print(f"  Classes: {list(classes.keys())}")
print(f"  Teachers: {len(teachers)}")
print(f"  Students: {sum(len(v) for v in student_data.values())}")
