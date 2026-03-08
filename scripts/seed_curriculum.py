#!/usr/bin/env python3
"""
Seed French national curriculum (programmes scolaires) into the database.

C1 is extracted from the official eduscol PDF.
C2, C3, C4, Lycée are loaded from pre-built JSON files in scripts/curriculum_data/.

Data is GLOBAL (no tenant_id) — shared across all schools and EduliaHub.

Usage:
    python3 scripts/seed_curriculum.py              # seed Cycle 1 only (fast, validated)
    python3 scripts/seed_curriculum.py --all        # seed all cycles (C1-C4 + Lycée)
    python3 scripts/seed_curriculum.py --reset      # drop and reseed
    python3 scripts/seed_curriculum.py --dry-run    # print extracted data, no DB write
    python3 scripts/seed_curriculum.py --cycle C4   # seed a specific cycle
"""

import os
import sys
import json
import re
import uuid
import argparse
import tempfile
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CURRICULUM_DATA_DIR = SCRIPT_DIR / "curriculum_data"

DRY_RUN_ONLY = not os.path.exists("/opt/edulia/backend/apps/api")

if not DRY_RUN_ONLY:
    sys.path.insert(0, "/opt/edulia/backend/apps/api")
    os.chdir("/opt/edulia/backend/apps/api")
    from dotenv import load_dotenv
    load_dotenv("/opt/edulia/backend/.env")
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session, sessionmaker
    DATABASE_URL = os.environ["DATABASE_URL"]
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
else:
    # Running locally — dry-run only
    from typing import Any as Session  # type stub so function signatures parse
    def text(s): return s  # noqa stub

# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------

# C1: extracted from official eduscol PDF
PDF_SOURCES = {
    "C1": {
        "url": "https://eduscol.education.fr/document/7883/download",
        "code": "FR-MENJ-C1-2021",
        "name": "Programme de l'école maternelle — Cycle 1",
        "cycle": "1",
        "year": 2021,
        "source": "BOENJS n°25 du 24 juin 2021",
        "levels": ["PS", "MS", "GS"],
    },
}

# C2–Lycée: loaded from pre-built JSON files in scripts/curriculum_data/
JSON_SOURCES = {
    "C2":    "FR-C2-2020.json",
    "C3":    "FR-C3-2020.json",
    "C4":    "FR-C4-2023.json",
    "LYCEE": "FR-LYCEE-2023.json",
}

# ---------------------------------------------------------------------------
# Cycle 1 extractor (validated — 77 competencies from 5 domains)
# ---------------------------------------------------------------------------

C1_DOMAINS = {
    "1": ("LANGAGE",    "Mobiliser le langage dans toutes ses dimensions"),
    "2": ("PHYSIQUE",   "Agir, s'exprimer, comprendre à travers l'activité physique"),
    "3": ("ARTISTIQUE", "Agir, s'exprimer, comprendre à travers les activités artistiques"),
    "4": ("MATHS",      "Acquérir les premiers outils mathématiques"),
    "5": ("MONDE",      "Explorer le monde"),
}

C1_SUB_DOMAINS = {
    "1.3":   "Langage oral et découverte de l'écrit",
    "2.2":   "Activités physiques — mouvements et déplacements",
    "3.2":   "Arts visuels, plastiques et musique",
    "4.1.2": "Nombres et quantités",
    "4.2.2": "Formes, grandeurs et suites organisées",
    "5.1.2": "Se repérer dans le temps et l'espace",
    "5.2.2": "Explorer le monde du vivant, des objets et de la matière",
}


def extract_cycle1(pdf_path: str) -> dict:
    """Extract structured competency data from Cycle 1 PDF."""
    try:
        import pdfplumber
    except ImportError:
        print("  [!] pdfplumber not installed — run: pip install pdfplumber --break-system-packages")
        sys.exit(1)

    with pdfplumber.open(pdf_path) as pdf:
        full_text = "\n".join(p.extract_text() or "" for p in pdf.pages)

    pattern = re.compile(
        r'([\d\.]+)\.\s*Ce qui est attendu[^\n]*\n(.*?)(?=\n\d+[\.\d]*\.\s+[A-Z]|\Z)',
        re.DOTALL
    )

    domain_map = {}
    for section_num, content in pattern.findall(full_text):
        top = section_num.split(".")[0]
        if top not in C1_DOMAINS:
            continue
        bullets = [
            l.strip().lstrip("–").strip()
            for l in content.split('\n')
            if l.strip().startswith('–')
        ]
        if not bullets:
            continue

        code, name = C1_DOMAINS[top]
        if top not in domain_map:
            domain_map[top] = {"code": code, "name": name, "sort_order": int(top), "competencies": []}

        sub = C1_SUB_DOMAINS.get(section_num, f"Section {section_num}")
        for i, b in enumerate(bullets):
            # Clean up PDF artifacts from the comparatif version (additions in green)
            clean = re.sub(r'\s+', ' ', b).strip()
            if len(clean) < 10:
                continue
            domain_map[top]["competencies"].append({
                "code": f"C1-{code}-{section_num.replace('.', '_')}-{i+1:02d}",
                "description": clean,
                "sub_domain": sub,
                "levels": ["GS"],  # attendus = end of cycle = GS level
                "sort_order": i + 1,
            })

    return {"domains": list(domain_map.values())}


# ---------------------------------------------------------------------------
# DB operations
# ---------------------------------------------------------------------------

def ensure_tables(db: Session):
    """Create curriculum tables if they don't exist yet."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS curriculum_frameworks (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code        VARCHAR(64) NOT NULL UNIQUE,
            name        VARCHAR(500) NOT NULL,
            country     VARCHAR(10) NOT NULL DEFAULT 'FR',
            cycle       VARCHAR(10),
            year        INTEGER,
            source      TEXT,
            levels      TEXT[] NOT NULL DEFAULT '{}',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS curriculum_domains (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            framework_id UUID NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
            code         VARCHAR(64) NOT NULL,
            name         TEXT NOT NULL,
            sort_order   INTEGER NOT NULL DEFAULT 0,
            UNIQUE (framework_id, code)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS curriculum_competencies (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id   UUID NOT NULL REFERENCES curriculum_domains(id) ON DELETE CASCADE,
            code        VARCHAR(100) NOT NULL UNIQUE,
            description TEXT NOT NULL,
            sub_domain  VARCHAR(255),
            levels      TEXT[] NOT NULL DEFAULT '{}',
            sort_order  INTEGER NOT NULL DEFAULT 0
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS course_competencies (
            course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            competency_id  UUID NOT NULL REFERENCES curriculum_competencies(id) ON DELETE CASCADE,
            PRIMARY KEY (course_id, competency_id)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS learning_objectives (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            competency_id UUID NOT NULL REFERENCES curriculum_competencies(id) ON DELETE CASCADE,
            term_id       UUID REFERENCES terms(id) ON DELETE SET NULL,
            group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
            week_from     INTEGER,
            week_to       INTEGER,
            notes         TEXT,
            status        VARCHAR(20) NOT NULL DEFAULT 'planned',
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS objective_content (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            objective_id  UUID NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
            content_type  VARCHAR(30) NOT NULL,
            content_ref   TEXT NOT NULL,
            label         TEXT,
            notes         TEXT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    db.commit()
    print("  ✓ Tables ensured")


def delete_framework(db: Session, framework_code: str):
    """Delete a framework and all its data (cascade)."""
    result = db.execute(
        text("SELECT id FROM curriculum_frameworks WHERE code = :code"),
        {"code": framework_code}
    ).fetchone()
    if result:
        db.execute(
            text("DELETE FROM curriculum_frameworks WHERE id = :id"),
            {"id": result[0]}
        )
        db.commit()
        print(f"  ✓ Deleted framework {framework_code}")


def seed_framework(db: Session, meta: dict, extracted: dict, dry_run: bool = False):
    """Insert a framework + domains + competencies into DB."""
    if dry_run:
        total = sum(len(d["competencies"]) for d in extracted["domains"])
        print(f"\n[DRY RUN] {meta['code']}")
        print(f"  Domains: {len(extracted['domains'])}")
        print(f"  Competencies: {total}")
        for domain in extracted["domains"]:
            print(f"\n  Domain: {domain['code']} — {domain['name']}")
            for c in domain["competencies"][:3]:
                print(f"    [{c['code']}] {c['description'][:80]}")
            if len(domain["competencies"]) > 3:
                print(f"    ... {len(domain['competencies'])-3} more")
        return

    # Insert framework
    fw_id = str(uuid.uuid4())
    db.execute(text("""
        INSERT INTO curriculum_frameworks (id, code, name, country, cycle, year, source, levels)
        VALUES (:id, :code, :name, :country, :cycle, :year, :source, :levels)
        ON CONFLICT (code) DO UPDATE SET
            name=EXCLUDED.name, year=EXCLUDED.year, source=EXCLUDED.source,
            levels=EXCLUDED.levels
        RETURNING id
    """), {
        "id": fw_id,
        "code": meta["code"],
        "name": meta["name"],
        "country": meta.get("country", "FR"),
        "cycle": meta.get("cycle"),
        "year": meta.get("year"),
        "source": meta.get("source"),
        "levels": meta.get("levels", []),
    })

    # Re-fetch in case of conflict update
    fw_id = db.execute(
        text("SELECT id FROM curriculum_frameworks WHERE code = :code"),
        {"code": meta["code"]}
    ).fetchone()[0]

    competency_count = 0
    for domain in extracted["domains"]:
        domain_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO curriculum_domains (id, framework_id, code, name, sort_order)
            VALUES (:id, :fw, :code, :name, :order)
            ON CONFLICT (framework_id, code) DO UPDATE SET name=EXCLUDED.name
            RETURNING id
        """), {
            "id": domain_id,
            "fw": str(fw_id),
            "code": domain["code"],
            "name": domain["name"],
            "order": domain["sort_order"],
        })
        domain_id = db.execute(
            text("SELECT id FROM curriculum_domains WHERE framework_id=:fw AND code=:code"),
            {"fw": str(fw_id), "code": domain["code"]}
        ).fetchone()[0]

        for comp in domain["competencies"]:
            db.execute(text("""
                INSERT INTO curriculum_competencies
                    (id, domain_id, code, description, sub_domain, levels, sort_order)
                VALUES (:id, :dom, :code, :desc, :sub, :levels, :order)
                ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description
            """), {
                "id": str(uuid.uuid4()),
                "dom": str(domain_id),
                "code": comp["code"],
                "desc": comp["description"],
                "sub": comp.get("sub_domain"),
                "levels": comp.get("levels", []),
                "order": comp["sort_order"],
            })
            competency_count += 1

    db.commit()
    print(f"  ✓ Seeded {meta['code']}: {len(extracted['domains'])} domains, {competency_count} competencies")


# ---------------------------------------------------------------------------
# Demo learning objectives (school plan for Mon Ecole — PS demo child)
# ---------------------------------------------------------------------------

MON_ECOLE_TENANT_ID = "63df01cd-041a-4b20-b263-0f739672410c"

DEMO_OBJECTIVES = [
    # code → (term_name_contains, week_from, week_to, notes, content_type, content_ref, content_label)
    ("C1-MATHS-4_1_2-13", "Trimestre 1", 3, 5,
     "Comptines et jeux de dénombrement avec des objets concrets",
     "external_url", "https://www.lumni.fr/video/compter-jusqu-a-10",
     "Lumni — Compter jusqu'à 10"),
    ("C1-MATHS-4_1_2-02", "Trimestre 1", 4, 6,
     "Collections d'objets — constituer une collection de 1 à 5 puis jusqu'à 10",
     "external_url", "https://mathador.fr",
     "Mathador Junior — Jeu de calcul mental"),
    ("C1-LANGAGE-1_3-01", "Trimestre 1", 1, 12,
     "Communication orale — travail en continu sur toute l'année",
     None, None, None),
    ("C1-LANGAGE-1_3-07", "Trimestre 2", 1, 4,
     "Apprentissage de comptines et poésies courtes",
     "external_url", "https://www.lumni.fr/dossier/comptines-et-chansons",
     "Lumni — Comptines et chansons"),
    ("C1-MONDE-5_2_2-03", "Trimestre 2", 5, 8,
     "Le corps humain — identification des parties du corps",
     "external_url", "https://www.lumni.fr/video/les-parties-du-corps",
     "Lumni — Les parties du corps"),
    ("C1-ARTISTIQUE-3_2-02", "Trimestre 1", 2, 6,
     "Dessin libre et représentation — séances hebdomadaires",
     None, None, None),
]


def seed_demo_objectives(db: Session):
    """Seed sample learning objectives for Mon Ecole (PS demo)."""
    tenant_id = MON_ECOLE_TENANT_ID

    # Check tenant exists
    tenant = db.execute(
        text("SELECT id FROM tenants WHERE id = :tid"),
        {"tid": tenant_id}
    ).fetchone()
    if not tenant:
        print("  [skip] Mon Ecole tenant not found — run seed_mon_ecole.py first")
        return

    # Get first term of Mon Ecole
    terms = db.execute(text("""
        SELECT t.id, t.name FROM terms t
        JOIN academic_years ay ON ay.id = t.academic_year_id
        WHERE ay.tenant_id = :tid
        ORDER BY t.start_date
    """), {"tid": tenant_id}).fetchall()

    term_map = {t[1]: str(t[0]) for t in terms} if terms else {}

    # Delete existing demo objectives for this tenant
    db.execute(text("DELETE FROM learning_objectives WHERE tenant_id = :tid"), {"tid": tenant_id})
    db.commit()

    count = 0
    for (comp_code, term_name, week_from, week_to, notes,
         content_type, content_ref, content_label) in DEMO_OBJECTIVES:

        comp = db.execute(
            text("SELECT id FROM curriculum_competencies WHERE code = :code"),
            {"code": comp_code}
        ).fetchone()
        if not comp:
            print(f"  [skip] competency {comp_code} not found")
            continue

        # Find matching term
        term_id = None
        for tname, tid in term_map.items():
            if term_name.lower() in tname.lower():
                term_id = tid
                break

        obj_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO learning_objectives
                (id, tenant_id, competency_id, term_id, week_from, week_to, notes, status)
            VALUES (:id, :tid, :cid, :term, :wf, :wt, :notes, 'planned')
        """), {
            "id": obj_id,
            "tid": tenant_id,
            "cid": str(comp[0]),
            "term": term_id,
            "wf": week_from,
            "wt": week_to,
            "notes": notes,
        })

        if content_type and content_ref:
            db.execute(text("""
                INSERT INTO objective_content (id, tenant_id, objective_id, content_type, content_ref, label)
                VALUES (:id, :tid, :oid, :ct, :cr, :lbl)
            """), {
                "id": str(uuid.uuid4()),
                "tid": tenant_id,
                "oid": obj_id,
                "ct": content_type,
                "cr": content_ref,
                "lbl": content_label,
            })
        count += 1

    db.commit()
    print(f"  ✓ Seeded {count} demo learning objectives for Mon Ecole")


# ---------------------------------------------------------------------------
# JSON-based seeding (C2, C3, C4, Lycée)
# ---------------------------------------------------------------------------

def seed_from_json_file(db: Session, json_path: Path, dry_run: bool = False):
    """Load a curriculum JSON file and seed it into the DB."""
    if not json_path.exists():
        print(f"  [skip] {json_path.name} not found in curriculum_data/")
        return False

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    meta = {k: v for k, v in data.items() if k != "domains"}
    extracted = {"domains": data["domains"]}

    if dry_run:
        total = sum(len(d["competencies"]) for d in extracted["domains"])
        print(f"\n[DRY RUN] {meta['code']} — {meta['name']}")
        print(f"  Domains: {len(extracted['domains'])}, Competencies: {total}")
        for domain in extracted["domains"][:3]:
            print(f"  Domain: {domain['code']} — {domain['name']} ({len(domain['competencies'])} comps)")
        if len(extracted["domains"]) > 3:
            print(f"  ... {len(extracted['domains'])-3} more domains")
        return True

    seed_framework(db, meta, extracted)
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def download_pdf(url: str, label: str) -> str:
    """Download PDF to a temp file, return path."""
    print(f"  Downloading {label}...")
    path = os.path.join(tempfile.gettempdir(), f"edulia_{label.replace(' ', '_')}.pdf")
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)
        print(f"  → Saved to {path}")
    else:
        print(f"  → Using cached {path}")
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Seed all cycles C1–Lycée")
    parser.add_argument("--cycle", help="Seed a specific cycle: C1, C2, C3, C4, LYCEE")
    parser.add_argument("--reset", action="store_true", help="Delete existing data before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Print extracted data without writing to DB")
    args = parser.parse_args()

    if DRY_RUN_ONLY and not args.dry_run:
        print("[!] Not running on VM — forcing --dry-run mode")
        args.dry_run = True

    # Determine which cycles to seed
    all_keys = list(PDF_SOURCES.keys()) + list(JSON_SOURCES.keys())  # C1, C2, C3, C4, LYCEE
    if args.cycle:
        cycles_to_seed = [args.cycle.upper()]
    elif args.all:
        cycles_to_seed = all_keys
    else:
        cycles_to_seed = ["C1"]

    db = None if args.dry_run else SessionLocal()

    if not args.dry_run:
        print("\n[1/3] Ensuring tables exist...")
        ensure_tables(db)

    # ── PDF-based cycles (C1) ────────────────────────────────────────────────
    for cycle_key in cycles_to_seed:
        if cycle_key not in PDF_SOURCES:
            continue

        meta = PDF_SOURCES[cycle_key]
        print(f"\n[Cycle {meta['cycle']}] {meta['name']}")

        if args.reset and not args.dry_run:
            delete_framework(db, meta["code"])

        pdf_path = download_pdf(meta["url"], meta["code"])
        print("  Extracting competencies...")
        extracted = extract_cycle1(pdf_path)

        total = sum(len(d["competencies"]) for d in extracted["domains"])
        print(f"  Found: {len(extracted['domains'])} domains, {total} competencies")

        seed_framework(db, meta, extracted, dry_run=args.dry_run)

    # ── JSON-based cycles (C2, C3, C4, Lycée) ───────────────────────────────
    for cycle_key in cycles_to_seed:
        if cycle_key not in JSON_SOURCES:
            continue

        json_file = CURRICULUM_DATA_DIR / JSON_SOURCES[cycle_key]
        print(f"\n[{cycle_key}] Loading from {JSON_SOURCES[cycle_key]}...")

        if args.reset and not args.dry_run:
            # Peek at the code in the JSON to delete it
            if json_file.exists():
                with open(json_file) as f:
                    code = json.load(f).get("code")
                if code:
                    delete_framework(db, code)

        seed_from_json_file(db, json_file, dry_run=args.dry_run)

    # ── Demo objectives ──────────────────────────────────────────────────────
    if not args.dry_run:
        print("\n[3/3] Seeding demo learning objectives...")
        seed_demo_objectives(db)

    if db:
        db.close()

    if not args.dry_run:
        print("\n✓ Curriculum seed complete.")
        db2 = SessionLocal()
        result = db2.execute(text("""
            SELECT f.code, COUNT(DISTINCT d.id) as domains, COUNT(c.id) as competencies
            FROM curriculum_frameworks f
            LEFT JOIN curriculum_domains d ON d.framework_id = f.id
            LEFT JOIN curriculum_competencies c ON c.domain_id = d.id
            GROUP BY f.code ORDER BY f.code
        """)).fetchall()
        print("\nDatabase summary:")
        for row in result:
            print(f"  {row[0]}: {row[1]} domains, {row[2]} competencies")
        db2.close()


if __name__ == "__main__":
    main()
