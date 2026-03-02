from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.db.models.user import User, UserRole, Role
from app.db.models.group import Group, GroupMembership
from app.db.models.attendance import AttendanceRecord
from app.db.models.gradebook import Assessment, Grade
from app.db.models.homework import Homework, Submission
from app.db.models.message import Thread, Message
from app.db.models.timetable import Session as TimetableSession

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Role-aware dashboard stats."""
    tid = user.tenant_id
    role = None
    for ur in user.user_roles:
        if ur.revoked_at is None and ur.role:
            role = ur.role.code
            break

    if role == "admin":
        teachers = db.query(func.count(User.id)).join(UserRole).join(Role).filter(
            User.tenant_id == tid, Role.code == "teacher").scalar()
        students = db.query(func.count(User.id)).join(UserRole).join(Role).filter(
            User.tenant_id == tid, Role.code == "student").scalar()
        parents = db.query(func.count(User.id)).join(UserRole).join(Role).filter(
            User.tenant_id == tid, Role.code == "parent").scalar()
        classes = db.query(func.count(Group.id)).filter(
            Group.tenant_id == tid, Group.type == "class").scalar()
        # Today's attendance
        today = date.today()
        present = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.tenant_id == tid, AttendanceRecord.date == today,
            AttendanceRecord.status == "present").scalar()
        absent = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.tenant_id == tid, AttendanceRecord.date == today,
            AttendanceRecord.status.in_(["absent", "late"])).scalar()
        return {
            "role": "admin",
            "stats": [
                {"key": "teachers", "label": "Enseignants", "value": teachers},
                {"key": "students", "label": "Élèves", "value": students},
                {"key": "parents", "label": "Parents", "value": parents},
                {"key": "classes", "label": "Classes", "value": classes},
            ],
            "attendance_today": {"present": present, "absent": absent},
        }

    elif role == "teacher":
        # My classes
        my_groups = db.query(GroupMembership.group_id).filter(
            GroupMembership.user_id == user.id, GroupMembership.role_in_group == "teacher").all()
        group_ids = [g[0] for g in my_groups]
        student_count = db.query(func.count(GroupMembership.id)).filter(
            GroupMembership.group_id.in_(group_ids), GroupMembership.role_in_group == "member").scalar() if group_ids else 0
        # My sessions today
        today_dow = date.today().weekday()
        sessions_today = db.query(func.count(TimetableSession.id)).filter(
            TimetableSession.tenant_id == tid, TimetableSession.teacher_id == user.id,
            TimetableSession.day_of_week == today_dow).scalar()
        # Pending homework submissions
        hw_ids = [h.id for h in db.query(Homework).filter(Homework.teacher_id == user.id).all()]
        pending = db.query(func.count(Submission.id)).filter(
            Submission.homework_id.in_(hw_ids), Submission.status == "submitted").scalar() if hw_ids else 0
        return {
            "role": "teacher",
            "stats": [
                {"key": "classes", "label": "Mes classes", "value": len(group_ids)},
                {"key": "students", "label": "Mes élèves", "value": student_count},
                {"key": "sessions_today", "label": "Cours aujourd'hui", "value": sessions_today},
                {"key": "pending_submissions", "label": "Devoirs à corriger", "value": pending},
            ],
        }

    elif role == "student":
        # My grades average
        my_grades = db.query(Grade.score).filter(
            Grade.student_id == user.id, Grade.score.isnot(None)).all()
        avg = round(sum(g[0] for g in my_grades) / len(my_grades), 1) if my_grades else 0
        # Pending homework
        my_groups = db.query(GroupMembership.group_id).filter(
            GroupMembership.user_id == user.id).all()
        group_ids = [g[0] for g in my_groups]
        pending_hw = db.query(func.count(Homework.id)).filter(
            Homework.group_id.in_(group_ids), Homework.due_date >= date.today()).scalar() if group_ids else 0
        # Absences
        absences = db.query(func.count(AttendanceRecord.id)).filter(
            AttendanceRecord.student_id == user.id,
            AttendanceRecord.status.in_(["absent", "late"])).scalar()
        return {
            "role": "student",
            "stats": [
                {"key": "average", "label": "Moyenne générale", "value": avg},
                {"key": "pending_homework", "label": "Devoirs à rendre", "value": pending_hw},
                {"key": "absences", "label": "Absences/Retards", "value": absences},
            ],
        }

    elif role == "parent":
        # Find children
        from app.db.models.user import Relationship
        children_rels = db.query(Relationship).filter(
            Relationship.from_user_id == user.id, Relationship.type == "guardian").all()
        children = []
        for rel in children_rels:
            child = db.query(User).filter(User.id == rel.to_user_id).first()
            if child:
                grades = db.query(Grade.score).filter(
                    Grade.student_id == child.id, Grade.score.isnot(None)).all()
                avg = round(sum(g[0] for g in grades) / len(grades), 1) if grades else 0
                absences = db.query(func.count(AttendanceRecord.id)).filter(
                    AttendanceRecord.student_id == child.id,
                    AttendanceRecord.status.in_(["absent", "late"])).scalar()
                children.append({
                    "id": str(child.id), "name": child.display_name,
                    "average": avg, "absences": absences,
                })
        return {"role": "parent", "children": children}

    return {"role": role or "unknown", "stats": []}
