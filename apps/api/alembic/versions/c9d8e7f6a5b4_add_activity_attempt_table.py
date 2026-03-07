"""add activity attempt table

Revision ID: c9d8e7f6a5b4
Revises: f7a8b9c0d1e2
Create Date: 2026-03-07 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c9d8e7f6a5b4'
down_revision: Union[str, None] = 'f7a8b9c0d1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activity_attempts',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('mode', sa.String(length=20), nullable=False, server_default='async'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('max_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('scored_at', sa.DateTime(), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('activity_id', 'student_id', name='uq_activity_attempt_student'),
    )
    op.create_index('ix_activity_attempts_tenant_id', 'activity_attempts', ['tenant_id'])
    op.create_index('ix_activity_attempts_activity_id', 'activity_attempts', ['activity_id'])
    op.create_index('ix_activity_attempts_student_id', 'activity_attempts', ['student_id'])


def downgrade() -> None:
    op.drop_index('ix_activity_attempts_student_id', table_name='activity_attempts')
    op.drop_index('ix_activity_attempts_activity_id', table_name='activity_attempts')
    op.drop_index('ix_activity_attempts_tenant_id', table_name='activity_attempts')
    op.drop_table('activity_attempts')
