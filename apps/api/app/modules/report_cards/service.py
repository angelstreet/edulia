from uuid import UUID
from decimal import Decimal
from io import BytesIO
from datetime import date

from fpdf import FPDF
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.models.gradebook import Assessment, Grade
from app.db.models.subject import Subject
from app.db.models.tenant import Tenant, AcademicYear, Term


class ReportCardPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, self._school_name, align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, self._report_title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} - Généré le {date.today().strftime('%d/%m/%Y')}", align="C")


def generate_report_card(
    db: Session,
    tenant_id: UUID,
    student_id: UUID,
    term_id: UUID | None = None,
) -> bytes:
    """Generate a PDF report card for a student."""
    student = db.query(User).filter(User.id == student_id, User.tenant_id == tenant_id).first()
    if not student:
        raise ValueError("Student not found")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    school_name = tenant.name if tenant else "École"

    # Get term info
    term_name = "Année complète"
    if term_id:
        term = db.query(Term).filter(Term.id == term_id).first()
        if term:
            term_name = term.name

    # Get all grades for this student, grouped by subject
    query = (
        db.query(
            Subject.name.label("subject_name"),
            Assessment.title,
            Assessment.date,
            Assessment.max_score,
            Assessment.coefficient,
            Grade.score,
            Grade.is_absent,
            Grade.is_exempt,
            Grade.comment,
        )
        .join(Assessment, Assessment.id == Grade.assessment_id)
        .join(Subject, Subject.id == Assessment.subject_id)
        .filter(
            Assessment.tenant_id == tenant_id,
            Grade.student_id == student_id,
        )
    )
    if term_id:
        query = query.filter(Assessment.term_id == term_id)

    rows = query.order_by(Subject.name, Assessment.date).all()

    # Group by subject
    subjects: dict[str, list] = {}
    for r in rows:
        subjects.setdefault(r.subject_name, []).append(r)

    # Build PDF
    pdf = ReportCardPDF()
    pdf._school_name = school_name
    pdf._report_title = f"Bulletin scolaire - {term_name}"
    pdf.alias_nb_pages()
    pdf.add_page()

    # Student info
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"Élève : {student.display_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Grades table per subject
    general_weighted_sum = Decimal("0")
    general_weighted_max = Decimal("0")
    subject_averages = []

    for subject_name, grades in subjects.items():
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 7, subject_name, fill=True, new_x="LMARGIN", new_y="NEXT")

        # Table header
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(70, 6, "Évaluation", border=1)
        pdf.cell(25, 6, "Date", border=1, align="C")
        pdf.cell(15, 6, "Coeff.", border=1, align="C")
        pdf.cell(25, 6, "Note", border=1, align="C")
        pdf.cell(0, 6, "Commentaire", border=1, new_x="LMARGIN", new_y="NEXT")

        weighted_sum = Decimal("0")
        weighted_max = Decimal("0")

        pdf.set_font("Helvetica", "", 8)
        for g in grades:
            pdf.cell(70, 5, g.title[:38], border=1)
            pdf.cell(25, 5, g.date.strftime("%d/%m/%Y") if g.date else "", border=1, align="C")
            pdf.cell(15, 5, f"x{g.coefficient}", border=1, align="C")

            if g.is_absent:
                score_text = "Abs."
            elif g.is_exempt:
                score_text = "Disp."
            elif g.score is not None:
                score_text = f"{g.score}/{g.max_score}"
                weighted_sum += g.score * g.coefficient
                weighted_max += g.max_score * g.coefficient
            else:
                score_text = "-"

            pdf.cell(25, 5, score_text, border=1, align="C")
            pdf.cell(0, 5, (g.comment or "")[:40], border=1, new_x="LMARGIN", new_y="NEXT")

        # Subject average
        avg = round((weighted_sum / weighted_max) * 20, 2) if weighted_max > 0 else None
        subject_averages.append((subject_name, avg))
        general_weighted_sum += weighted_sum
        general_weighted_max += weighted_max

        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(110, 6, "Moyenne de la matière", border=1)
        pdf.cell(25, 6, f"{avg}/20" if avg else "-", border=1, align="C")
        pdf.cell(0, 6, "", border=1, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

    # General average
    general_avg = round((general_weighted_sum / general_weighted_max) * 20, 2) if general_weighted_max > 0 else None
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(220, 235, 255)
    pdf.cell(0, 10, f"Moyenne générale : {general_avg}/20" if general_avg else "Moyenne générale : -",
             fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    # Summary table
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(80, 6, "Matière", border=1, fill=True)
    pdf.cell(30, 6, "Moyenne", border=1, fill=True, align="C")
    pdf.cell(0, 6, "Appréciation", border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    for name, avg in subject_averages:
        appreciation = ""
        if avg is not None:
            if avg >= 16:
                appreciation = "Très bien"
            elif avg >= 14:
                appreciation = "Bien"
            elif avg >= 12:
                appreciation = "Assez bien"
            elif avg >= 10:
                appreciation = "Passable"
            else:
                appreciation = "Insuffisant"
        pdf.cell(80, 6, name, border=1)
        pdf.cell(30, 6, f"{avg}/20" if avg else "-", border=1, align="C")
        pdf.cell(0, 6, appreciation, border=1, new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())


