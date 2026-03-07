"""add activity table

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-03-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activities',
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(length=20), nullable=False, server_default='qcm'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('questions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subject_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('replay_deadline', sa.DateTime(), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_activities_tenant_id', 'activities', ['tenant_id'])
    op.create_index('ix_activities_group_id', 'activities', ['group_id'])
    op.create_index('ix_activities_status', 'activities', ['status'])


def downgrade() -> None:
    op.drop_index('ix_activities_status', table_name='activities')
    op.drop_index('ix_activities_group_id', table_name='activities')
    op.drop_index('ix_activities_tenant_id', table_name='activities')
    op.drop_table('activities')
