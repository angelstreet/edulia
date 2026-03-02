from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db.models.portfolio import Portfolio
from app.db.models.certificate import Certificate
from app.db.models.user import User
from app.core.dependencies import get_current_user
from .schemas import PortfolioResponse, PortfolioUpdate

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


def _to_response(p: Portfolio, db: Session) -> PortfolioResponse:
    user = db.query(User).filter(User.id == p.user_id).first()
    cert_count = db.query(func.count(Certificate.id)).filter(Certificate.user_id == p.user_id).scalar()
    r = PortfolioResponse.model_validate(p)
    r.user_name = user.display_name if user else None
    r.certificate_count = cert_count
    return r


@router.get("/me", response_model=PortfolioResponse)
def get_my_portfolio(db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not p:
        # Auto-create on first access
        slug = f"{user.first_name.lower()}-{user.last_name.lower()}".replace(" ", "-")
        # Ensure unique slug
        existing = db.query(Portfolio).filter(Portfolio.slug == slug).first()
        if existing:
            import uuid
            slug = f"{slug}-{str(uuid.uuid4())[:4]}"
        p = Portfolio(user_id=user.id, slug=slug)
        db.add(p)
        db.commit()
        db.refresh(p)
    return _to_response(p, db)


@router.patch("/me", response_model=PortfolioResponse)
def update_my_portfolio(data: PortfolioUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    p = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not p:
        raise HTTPException(404, "Portfolio not found — call GET /portfolio/me first")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(p, key, val)
    db.commit()
    db.refresh(p)
    return _to_response(p, db)


@router.get("/{slug}", response_model=PortfolioResponse)
def get_public_portfolio(slug: str, db: Session = Depends(get_db)):
    """Public: view anyone's portfolio by slug."""
    p = db.query(Portfolio).filter(Portfolio.slug == slug, Portfolio.is_public == True).first()
    if not p:
        raise HTTPException(404, "Portfolio not found or not public")
    return _to_response(p, db)


@router.get("/public/{slug}")
def public_portfolio(
    slug: str,
    db: Session = Depends(get_db),
):
    """Public portfolio page — no auth required."""
    from app.db.models.portfolio import Portfolio
    from app.db.models.certificate import Certificate
    portfolio = db.query(Portfolio).filter(Portfolio.slug == slug, Portfolio.is_public == True).first()
    if not portfolio:
        from fastapi import HTTPException
        raise HTTPException(404, "Portfolio not found")
    
    certs = db.query(Certificate).filter(Certificate.user_id == portfolio.user_id).order_by(Certificate.issued_date.desc()).all()
    
    return {
        "slug": portfolio.slug,
        "user_name": portfolio.user_name,
        "headline": portfolio.headline,
        "bio": portfolio.bio,
        "linkedin_url": portfolio.linkedin_url,
        "website_url": portfolio.website_url,
        "certificates": [
            {"title": c.title, "issuer": c.issuer, "issued_date": str(c.issued_date) if c.issued_date else None, "skills": c.skills}
            for c in certs
        ],
    }
