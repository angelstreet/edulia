#!/usr/bin/env python3
"""
Seed French national curriculum (programmes scolaires) into the database.

Downloads official PDFs from eduscol.education.fr and extracts competencies.
Data is GLOBAL (no tenant_id) — shared across all schools and EduliaHub.

Usage:
    python3 scripts/seed_curriculum.py              # seed Cycle 1 only (fast, validated)
    python3 scripts/seed_curriculum.py --all        # seed all cycles
    python3 scripts/seed_curriculum.py --reset      # drop and reseed
    python3 scripts/seed_curriculum.py --dry-run    # print extracted data, no DB write
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
# PDF sources
# ---------------------------------------------------------------------------

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
    "C3": {
        "url": "https://eduscol.education.fr/document/50990/download",
        "code": "FR-MENJ-C3-2023",
        "name": "Programme du cycle de consolidation — Cycle 3",
        "cycle": "3",
        "year": 2023,
        "source": "BOEN n°31 du 30 juillet 2020, modifié BOEN n°25 du 22 juin 2023",
        "levels": ["CM1", "CM2", "6e"],
    },
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
    parser.add_argument("--all", action="store_true", help="Seed all cycles (default: Cycle 1 only)")
    parser.add_argument("--reset", action="store_true", help="Delete existing data before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Print extracted data without writing to DB")
    args = parser.parse_args()

    cycles_to_seed = list(PDF_SOURCES.keys()) if args.all else ["C1"]

    if DRY_RUN_ONLY and not args.dry_run:
        print("[!] Not running on VM — forcing --dry-run mode")
        args.dry_run = True

    db = None if args.dry_run else SessionLocal()

    if not args.dry_run:
        print("\n[1/3] Ensuring tables exist...")
        ensure_tables(db)

    for cycle_key in cycles_to_seed:
        meta = PDF_SOURCES[cycle_key]
        print(f"\n[Cycle {meta['cycle']}] {meta['name']}")

        if args.reset and not args.dry_run:
            delete_framework(db, meta["code"])

        # Download PDF
        pdf_path = download_pdf(meta["url"], meta["code"])

        # Extract
        print("  Extracting competencies...")
        if cycle_key == "C1":
            extracted = extract_cycle1(pdf_path)
        else:
            print(f"  [!] Extractor for Cycle {meta['cycle']} not yet implemented — skipping")
            continue

        total = sum(len(d["competencies"]) for d in extracted["domains"])
        print(f"  Found: {len(extracted['domains'])} domains, {total} competencies")

        seed_framework(db, meta, extracted, dry_run=args.dry_run)

    if db:
        db.close()
    if not args.dry_run:
        print("\n✓ Curriculum seed complete.")
        # Print summary
        result = db.execute(text("""
            SELECT f.code, COUNT(DISTINCT d.id) as domains, COUNT(c.id) as competencies
            FROM curriculum_frameworks f
            LEFT JOIN curriculum_domains d ON d.framework_id = f.id
            LEFT JOIN curriculum_competencies c ON c.domain_id = d.id
            GROUP BY f.code ORDER BY f.code
        """)).fetchall()
        print("\nDatabase summary:")
        for row in result:
            print(f"  {row[0]}: {row[1]} domains, {row[2]} competencies")

    if db:
        db.close()


if __name__ == "__main__":
    main()
