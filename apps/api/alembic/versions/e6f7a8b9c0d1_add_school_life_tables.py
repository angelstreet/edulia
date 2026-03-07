"""add school life tables

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'incidents',
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reported_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('incident_type', sa.String(length=50), nullable=False, server_default='behavior'),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='low'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='open'),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_incidents_tenant_id', 'incidents', ['tenant_id'])
    op.create_index('ix_incidents_student_id', 'incidents', ['student_id'])


def downgrade() -> None:
    op.drop_index('ix_incidents_student_id', table_name='incidents')
    op.drop_index('ix_incidents_tenant_id', table_name='incidents')
    op.drop_table('incidents')
