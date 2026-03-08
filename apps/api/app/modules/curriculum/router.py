from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from .service import get_frameworks, get_competencies_for_level, get_student_programme
from app.core.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/api/v1/curriculum", tags=["curriculum"])


@router.get("/frameworks")
def list_frameworks(db: Session = Depends(get_db)):
    return get_frameworks(db)


@router.get("/for-level/{level}")
def competencies_for_level(level: str, db: Session = Depends(get_db)):
    """Return all competencies for a school level (e.g. PS, GS, CP, CM1).
    No auth required — public data."""
    return get_competencies_for_level(db, level.upper())


@router.get("/student/{student_id}")
def student_programme(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return gov competencies + school learning objectives for a student.
    Caller must be the student, their parent, or a teacher/admin in same tenant."""
    return get_student_programme(db, student_id, current_user)
