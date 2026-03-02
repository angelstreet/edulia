from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.certificate import Certificate
from app.core.dependencies import get_current_user
from .schemas import CertificateCreate, CertificateResponse

router = APIRouter(prefix="/api/v1/certificates", tags=["certificates"])


@router.get("", response_model=list[CertificateResponse])
def list_my_certificates(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Certificate).filter(Certificate.user_id == user.id).order_by(Certificate.created_at.desc()).all()


@router.post("", response_model=CertificateResponse, status_code=201)
def create_certificate(data: CertificateCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cert = Certificate(user_id=user.id, **data.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


@router.delete("/{cert_id}", status_code=204)
def delete_certificate(cert_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    cert = db.query(Certificate).filter(Certificate.id == cert_id, Certificate.user_id == user.id).first()
    if not cert:
        raise HTTPException(404, "Certificate not found")
    db.delete(cert)
    db.commit()


@router.get("/user/{user_id}", response_model=list[CertificateResponse])
def list_user_certificates(user_id: str, db: Session = Depends(get_db)):
    """Public: view anyone's certificates (for portfolio)."""
    return db.query(Certificate).filter(Certificate.user_id == user_id).order_by(Certificate.created_at.desc()).all()
