from uuid import UUID
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.db.models.user import User
from .service import generate_report_card

router = APIRouter(prefix="/report-cards", tags=["Report Cards"])


@router.get("/students/{student_id}/pdf")
def download_report_card(
    student_id: UUID,
    term_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and download a PDF report card for a student."""
    pdf_bytes = generate_report_card(db, current_user.tenant_id, student_id, term_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=bulletin_{student_id}.pdf"},
    )
