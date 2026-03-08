from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.models.user import User


# ─── Level → Cycle mapping ────────────────────────────────────────────────────

LEVEL_TO_CYCLE = {
    "PS": "1", "MS": "1", "GS": "1",
    "CP": "2", "CE1": "2", "CE2": "2",
    "CM1": "3", "CM2": "3", "6E": "3",
    "5E": "4", "4E": "4", "3E": "4",
}


def get_frameworks(db: Session):
    rows = db.execute(text("""
        SELECT id, code, name, country, cycle, year, source, levels
        FROM curriculum_frameworks
        ORDER BY cycle, year
    """)).fetchall()
    return [
        {"id": str(r[0]), "code": r[1], "name": r[2], "country": r[3],
         "cycle": r[4], "year": r[5], "source": r[6], "levels": r[7]}
        for r in rows
    ]


def get_competencies_for_level(db: Session, level: str) -> dict:
    """Return framework + domains + competencies for a given school level."""
    cycle = LEVEL_TO_CYCLE.get(level.upper())
    if not cycle:
        return {"error": f"Unknown level: {level}"}

    fw = db.execute(text("""
        SELECT id, code, name, country, cycle, year, source, levels
        FROM curriculum_frameworks
        WHERE cycle = :cycle AND country = 'FR'
        ORDER BY year DESC
        LIMIT 1
    """), {"cycle": cycle}).fetchone()

    if not fw:
        return {"framework": None, "domains": []}

    fw_id = fw[0]
    domains = db.execute(text("""
        SELECT id, code, name, sort_order
        FROM curriculum_domains
        WHERE framework_id = :fw_id
        ORDER BY sort_order
    """), {"fw_id": str(fw_id)}).fetchall()

    result_domains = []
    for d in domains:
        comps = db.execute(text("""
            SELECT id, code, description, sub_domain, levels, sort_order
            FROM curriculum_competencies
            WHERE domain_id = :dom_id
            ORDER BY sub_domain, sort_order
        """), {"dom_id": str(d[0])}).fetchall()

        result_domains.append({
            "id": str(d[0]),
            "code": d[1],
            "name": d[2],
            "sort_order": d[3],
            "competencies": [
                {
                    "id": str(c[0]),
                    "code": c[1],
                    "description": c[2],
                    "sub_domain": c[3],
                    "levels": c[4],
                    "sort_order": c[5],
                }
                for c in comps
            ],
        })

    return {
        "framework": {
            "id": str(fw_id),
            "code": fw[1],
            "name": fw[2],
            "country": fw[3],
            "cycle": fw[4],
            "year": fw[5],
            "source": fw[6],
            "levels": fw[7],
        },
        "level": level.upper(),
        "domains": result_domains,
    }


def get_student_programme(db: Session, student_id: str, current_user: User) -> dict:
    """Return competencies + school objectives for a specific student."""

    # Resolve student level from group membership
    level_row = db.execute(text("""
        SELECT g.name
        FROM group_memberships gm
        JOIN groups g ON g.id = gm.group_id
        WHERE gm.user_id = :uid AND g.tenant_id = :tid
          AND g.type IN ('class', 'section')
        LIMIT 1
    """), {"uid": student_id, "tid": str(current_user.tenant_id)}).fetchone()

    # Try to infer level from group name (e.g. "Petite Section", "CP", "CM1")
    level = _infer_level(level_row[0] if level_row else "")

    # Get gov competencies for this level
    programme = get_competencies_for_level(db, level)

    # Overlay school learning objectives (tenant-scoped)
    objectives = db.execute(text("""
        SELECT lo.id, lo.competency_id, lo.term_id, lo.week_from, lo.week_to,
               lo.notes, lo.status,
               t.name as term_name
        FROM learning_objectives lo
        LEFT JOIN terms t ON t.id = lo.term_id
        WHERE lo.tenant_id = :tid
    """), {"tid": str(current_user.tenant_id)}).fetchall()

    obj_map = {}
    for o in objectives:
        obj_map[str(o[1])] = {
            "id": str(o[0]),
            "term": o[7],
            "week_from": o[3],
            "week_to": o[4],
            "notes": o[5],
            "status": o[6],
            "content": [],
        }

    # Fetch content links
    contents = db.execute(text("""
        SELECT oc.objective_id, oc.content_type, oc.content_ref, oc.label
        FROM objective_content oc
        JOIN learning_objectives lo ON lo.id = oc.objective_id
        WHERE lo.tenant_id = :tid
    """), {"tid": str(current_user.tenant_id)}).fetchall()

    # Build reverse map: objective_id → competency_id key
    obj_id_to_comp_id = {v["id"]: k for k, v in obj_map.items()}
    for c in contents:
        obj_id = str(c[0])
        comp_id = obj_id_to_comp_id.get(obj_id)
        if comp_id and comp_id in obj_map:
            obj_map[comp_id]["content"].append({
                "type": c[1], "ref": c[2], "label": c[3]
            })

    # Merge objectives into competencies
    for domain in programme.get("domains", []):
        for comp in domain["competencies"]:
            comp["school_plan"] = obj_map.get(comp["id"])

    programme["student_id"] = student_id
    programme["detected_level"] = level
    programme["group_name"] = level_row[0] if level_row else None
    return programme


def _infer_level(group_name: str) -> str:
    """Guess school level from group name string."""
    name = group_name.upper()
    mapping = {
        "PETITE SECTION": "PS", "PS": "PS",
        "MOYENNE SECTION": "MS", "MS": "MS",
        "GRANDE SECTION": "GS", "GS": "GS",
        "CP": "CP", "CE1": "CE1", "CE2": "CE2",
        "CM1": "CM1", "CM2": "CM2",
        "6": "6E", "5": "5E", "4": "4E", "3": "3E",
    }
    for key, level in mapping.items():
        if key in name:
            return level
    return "PS"  # default for unknown
