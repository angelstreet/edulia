#!/usr/bin/env python3
"""CLI to create a new tenant with admin user.

Usage:
    python scripts/create_tenant.py --name "École Saint-Joseph" --slug saint-joseph \
        --type school --admin-email admin@saint-joseph.fr --admin-password changeme123
"""
import argparse
import sys
import os

# Add apps/api to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.db.models.tenant import Campus, Tenant
from app.db.models.user import Role, User, UserRole


def create_tenant(name: str, slug: str, type: str, admin_email: str, admin_password: str):
    db = SessionLocal()
    try:
        # Check if tenant already exists
        existing = db.query(Tenant).filter(Tenant.slug == slug).first()
        if existing:
            print(f"Tenant with slug '{slug}' already exists")
            sys.exit(1)

        # Create tenant
        tenant = Tenant(
            name=name,
            slug=slug,
            type=type,
            settings={
                "timezone": "Europe/Paris",
                "locale": "fr",
                "currency": "EUR",
                "enabled_modules": ["timetable", "attendance", "gradebook", "messaging"],
                "grading_scale": 20,
            },
        )
        db.add(tenant)
        db.flush()

        # Create default campus
        campus = Campus(
            tenant_id=tenant.id,
            name=f"{name} - Campus principal",
            is_default=True,
        )
        db.add(campus)
        db.flush()

        # Create admin role
        admin_role = Role(
            tenant_id=tenant.id,
            code="admin",
            display_name="Administrator",
            is_system=True,
            permissions=[
                "admin.user.create",
                "admin.user.edit",
                "admin.user.delete",
                "admin.user.view",
                "admin.tenant.edit",
                "admin.role.manage",
                "gradebook.grade.create",
                "gradebook.grade.edit",
                "attendance.record.create",
                "messaging.thread.send",
            ],
        )
        db.add(admin_role)

        # Create teacher role
        teacher_role = Role(
            tenant_id=tenant.id,
            code="teacher",
            display_name="Teacher",
            is_system=True,
            permissions=[
                "gradebook.grade.create",
                "gradebook.grade.edit",
                "attendance.record.create",
                "messaging.thread.send",
            ],
        )
        db.add(teacher_role)

        # Create student role
        student_role = Role(
            tenant_id=tenant.id,
            code="student",
            display_name="Student",
            is_system=True,
            permissions=[
                "gradebook.grade.view",
                "messaging.thread.send",
            ],
        )
        db.add(student_role)

        # Create parent role
        parent_role = Role(
            tenant_id=tenant.id,
            code="parent",
            display_name="Parent",
            is_system=True,
            permissions=[
                "gradebook.grade.view",
                "attendance.record.view",
                "messaging.thread.send",
            ],
        )
        db.add(parent_role)
        db.flush()

        # Create admin user
        admin_user = User(
            tenant_id=tenant.id,
            email=admin_email,
            password_hash=hash_password(admin_password),
            first_name="Admin",
            last_name=name,
            display_name=f"Admin {name}",
            status="active",
        )
        db.add(admin_user)
        db.flush()

        # Assign admin role
        user_role = UserRole(
            user_id=admin_user.id,
            role_id=admin_role.id,
            scope_type="tenant",
        )
        db.add(user_role)

        db.commit()
        print(f"Tenant '{name}' created successfully!")
        print(f"  Tenant ID: {tenant.id}")
        print(f"  Slug: {slug}")
        print(f"  Campus: {campus.name}")
        print(f"  Admin: {admin_email}")
        print(f"  Roles created: admin, teacher, student, parent")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a new Edulia tenant")
    parser.add_argument("--name", required=True, help="Tenant name")
    parser.add_argument("--slug", required=True, help="URL slug (unique)")
    parser.add_argument("--type", default="school", choices=["school", "tutoring_center", "enterprise"])
    parser.add_argument("--admin-email", required=True, help="Admin email")
    parser.add_argument("--admin-password", required=True, help="Admin password")

    args = parser.parse_args()
    create_tenant(args.name, args.slug, args.type, args.admin_email, args.admin_password)
