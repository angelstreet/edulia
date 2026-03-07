"""add calendar tables

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b8
Create Date: 2026-03-07 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'add_course_subscriptions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'calendar_events',
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=False),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False, server_default='general'),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('target_roles', sa.String(length=255), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_calendar_events_tenant_id', 'calendar_events', ['tenant_id'])
    op.create_index('ix_calendar_events_start_at', 'calendar_events', ['start_at'])


def downgrade() -> None:
    op.drop_index('ix_calendar_events_start_at', table_name='calendar_events')
    op.drop_index('ix_calendar_events_tenant_id', table_name='calendar_events')
    op.drop_table('calendar_events')
