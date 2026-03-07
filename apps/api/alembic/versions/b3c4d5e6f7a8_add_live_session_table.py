"""add live session table

Revision ID: b3c4d5e6f7a8
Revises: c9d8e7f6a5b4
Create Date: 2026-03-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'c9d8e7f6a5b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'live_sessions',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('teacher_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('join_code', sa.String(length=6), nullable=False),
        sa.Column('state', sa.String(length=20), nullable=False, server_default='lobby'),
        sa.Column('current_question_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('replay_open', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('replay_deadline', sa.DateTime(), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('join_code', name='uq_live_session_join_code'),
    )
    op.create_index('ix_live_sessions_tenant_id', 'live_sessions', ['tenant_id'])
    op.create_index('ix_live_sessions_activity_id', 'live_sessions', ['activity_id'])
    op.create_index('ix_live_sessions_join_code', 'live_sessions', ['join_code'])


def downgrade() -> None:
    op.drop_index('ix_live_sessions_join_code', table_name='live_sessions')
    op.drop_index('ix_live_sessions_activity_id', table_name='live_sessions')
    op.drop_index('ix_live_sessions_tenant_id', table_name='live_sessions')
    op.drop_table('live_sessions')
