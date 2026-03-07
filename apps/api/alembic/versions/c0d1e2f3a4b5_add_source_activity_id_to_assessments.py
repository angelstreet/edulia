"""add_source_activity_id_to_assessments

Revision ID: c0d1e2f3a4b5
Revises: b3c4d5e6f7a8
Create Date: 2026-03-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = "c0d1e2f3a4b5"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assessments",
        sa.Column("source_activity_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_assessments_source_activity_id",
        "assessments",
        ["source_activity_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_assessments_source_activity_id", table_name="assessments")
    op.drop_column("assessments", "source_activity_id")
