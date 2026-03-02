from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.db.models.user import User
from uuid import UUID
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


@router.post("/courses/{course_id}/subscribe")
def subscribe_to_course(
    course_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Subscribe (bookmark) a course for tracking."""
    from app.db.models.catalog import CourseSubscription
    existing = db.query(CourseSubscription).filter(
        CourseSubscription.user_id == current_user.id,
        CourseSubscription.course_id == course_id
    ).first()
    if existing:
        return {"status": "already_subscribed"}
    sub = CourseSubscription(user_id=current_user.id, course_id=course_id)
    db.add(sub)
    db.commit()
    return {"status": "subscribed"}


@router.delete("/courses/{course_id}/subscribe")
def unsubscribe_from_course(
    course_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.db.models.catalog import CourseSubscription
    sub = db.query(CourseSubscription).filter(
        CourseSubscription.user_id == current_user.id,
        CourseSubscription.course_id == course_id
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"status": "unsubscribed"}


@router.get("/my-courses")
def my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.db.models.catalog import CourseSubscription, Course
    subs = (
        db.query(Course)
        .join(CourseSubscription, CourseSubscription.course_id == Course.id)
        .filter(CourseSubscription.user_id == current_user.id)
        .all()
    )
    return subs


@router.post("/courses/{course_id}/rate")
def rate_course(
    course_id: UUID,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate a course (1-5 stars + optional review)."""
    from app.db.models.catalog import CourseRating
    rating_val = request.get("rating", 0)
    if not (1 <= rating_val <= 5):
        from fastapi import HTTPException
        raise HTTPException(400, "Rating must be between 1 and 5")
    
    existing = db.query(CourseRating).filter(
        CourseRating.user_id == current_user.id,
        CourseRating.course_id == course_id
    ).first()
    if existing:
        existing.rating = rating_val
        existing.review = request.get("review")
    else:
        db.add(CourseRating(
            user_id=current_user.id, course_id=course_id,
            rating=rating_val, review=request.get("review")
        ))
    db.commit()
    return {"status": "rated"}


@router.get("/courses/{course_id}/ratings")
def get_course_ratings(
    course_id: UUID,
    db: Session = Depends(get_db),
):
    """Get ratings for a course."""
    from app.db.models.catalog import CourseRating
    from sqlalchemy import func
    ratings = db.query(CourseRating).filter(CourseRating.course_id == course_id).all()
    avg = db.query(func.avg(CourseRating.rating)).filter(CourseRating.course_id == course_id).scalar()
    return {
        "average_rating": round(float(avg), 1) if avg else None,
        "total_ratings": len(ratings),
        "ratings": [{"rating": r.rating, "review": r.review, "created_at": r.created_at} for r in ratings],
    }
