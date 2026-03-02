from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundException
from app.db.models.forms import Form, FormField, FormResponse


def create_form(
    db: Session,
    tenant_id: UUID,
    created_by: UUID,
    title: str,
    description: str | None = None,
    type: str = "survey",
    target_roles: list[str] | None = None,
    deadline=None,
    fields: list[dict] | None = None,
) -> Form:
    form = Form(
        tenant_id=tenant_id,
        created_by=created_by,
        title=title,
        description=description,
        type=type,
        target_roles=target_roles or [],
        deadline=deadline,
    )
    db.add(form)
    db.flush()

    for i, field_data in enumerate(fields or []):
        field = FormField(
            form_id=form.id,
            label=field_data["label"],
            field_type=field_data["field_type"],
            required=field_data.get("required", False),
            options=field_data.get("options", []),
            position=field_data.get("position", i),
        )
        db.add(field)

    db.commit()
    db.refresh(form)
    return form


def list_forms(
    db: Session,
    tenant_id: UUID,
    status: str | None = None,
    target_role: str | None = None,
) -> list[dict]:
    query = (
        db.query(Form)
        .options(joinedload(Form.responses))
        .filter(Form.tenant_id == tenant_id)
    )
    if status:
        query = query.filter(Form.status == status)
    if target_role:
        query = query.filter(Form.target_roles.any(target_role))

    forms = query.order_by(Form.created_at.desc()).all()
    result = []
    for f in forms:
        d = _form_to_dict(f)
        d["response_count"] = len(f.responses)
        result.append(d)
    return result


def get_form(db: Session, form_id: UUID) -> dict:
    form = (
        db.query(Form)
        .options(joinedload(Form.fields), joinedload(Form.responses))
        .filter(Form.id == form_id)
        .first()
    )
    if not form:
        raise NotFoundException("Form not found")
    d = _form_to_dict(form)
    d["response_count"] = len(form.responses)
    d["fields"] = [_field_to_dict(f) for f in sorted(form.fields, key=lambda x: x.position)]
    return d


def update_form(db: Session, form_id: UUID, **kwargs) -> Form:
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise NotFoundException("Form not found")
    for key, value in kwargs.items():
        if value is not None:
            setattr(form, key, value)
    db.commit()
    db.refresh(form)
    return form


def submit_response(db: Session, form_id: UUID, user_id: UUID, data: dict) -> FormResponse:
    response = FormResponse(form_id=form_id, user_id=user_id, data=data)
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


def get_responses(db: Session, form_id: UUID) -> list[FormResponse]:
    return (
        db.query(FormResponse)
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
        .all()
    )


def get_stats(db: Session, form_id: UUID) -> list[dict]:
    form = (
        db.query(Form)
        .options(joinedload(Form.fields), joinedload(Form.responses))
        .filter(Form.id == form_id)
        .first()
    )
    if not form:
        raise NotFoundException("Form not found")

    stats = []
    for field in sorted(form.fields, key=lambda x: x.position):
        summary: dict = {}
        if field.field_type in ("radio", "select", "checkbox"):
            counts: dict[str, int] = {}
            for response in form.responses:
                val = response.data.get(str(field.id))
                if isinstance(val, list):
                    for v in val:
                        counts[v] = counts.get(v, 0) + 1
                elif val:
                    counts[str(val)] = counts.get(str(val), 0) + 1
            summary = counts
        else:
            summary = {"total_responses": len(form.responses)}

        stats.append({
            "field_id": field.id,
            "label": field.label,
            "field_type": field.field_type,
            "summary": summary,
        })
    return stats


def _form_to_dict(form: Form) -> dict:
    return {
        "id": form.id,
        "tenant_id": form.tenant_id,
        "title": form.title,
        "description": form.description,
        "type": form.type,
        "status": form.status,
        "target_roles": form.target_roles or [],
        "deadline": form.deadline,
        "created_by": form.created_by,
        "created_at": form.created_at,
        "response_count": 0,
    }


def _field_to_dict(field: FormField) -> dict:
    return {
        "id": field.id,
        "form_id": field.form_id,
        "label": field.label,
        "field_type": field.field_type,
        "required": field.required,
        "options": field.options or [],
        "position": field.position,
    }
