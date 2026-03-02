from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models.catalog import Course, LearningPlatform
from .schemas import CourseResponse, PlatformResponse

router = APIRouter(prefix="/api/v1/catalog", tags=["catalog"])


@router.get("/platforms", response_model=list[PlatformResponse])
def list_platforms(db: Session = Depends(get_db)):
    platforms = db.query(LearningPlatform).order_by(LearningPlatform.name).all()
    result = []
    for p in platforms:
        count = db.query(func.count(Course.id)).filter(Course.platform_id == p.id).scalar()
        r = PlatformResponse.model_validate(p)
        r.course_count = count
        result.append(r)
    return result


@router.get("/platforms/{slug}", response_model=PlatformResponse)
def get_platform(slug: str, db: Session = Depends(get_db)):
    p = db.query(LearningPlatform).filter(LearningPlatform.slug == slug).first()
    if not p:
        from fastapi import HTTPException
        raise HTTPException(404, "Platform not found")
    count = db.query(func.count(Course.id)).filter(Course.platform_id == p.id).scalar()
    r = PlatformResponse.model_validate(p)
    r.course_count = count
    return r


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(
    platform: str | None = None,
    category: str | None = None,
    difficulty: str | None = None,
    language: str | None = None,
    free_only: bool = False,
    search: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Course).join(LearningPlatform)
    if platform:
        q = q.filter(LearningPlatform.slug == platform)
    if category:
        q = q.filter(Course.category == category)
    if difficulty:
        q = q.filter(Course.difficulty == difficulty)
    if language:
        q = q.filter(Course.language == language)
    if free_only:
        q = q.filter(Course.is_free == True)
    if search:
        q = q.filter(Course.title.ilike(f"%{search}%"))
    courses = q.order_by(Course.title).offset(offset).limit(limit).all()
    result = []
    for c in courses:
        r = CourseResponse.model_validate(c)
        r.platform_name = c.platform.name
        result.append(r)
    return result


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)):
    c = db.query(Course).filter(Course.id == course_id).first()
    if not c:
        from fastapi import HTTPException
        raise HTTPException(404, "Course not found")
    r = CourseResponse.model_validate(c)
    r.platform_name = c.platform.name
    return r
