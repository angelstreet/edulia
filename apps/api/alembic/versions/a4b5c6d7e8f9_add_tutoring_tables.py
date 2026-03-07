"""Add tutoring_sessions, tutoring_packages, tutoring_invoices tables

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-03-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = 'a4b5c6d7e8f9'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('tutoring_packages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('tutor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sessions_total', sa.Integer, nullable=False),
        sa.Column('sessions_used', sa.Integer, nullable=False, server_default='0'),
        sa.Column('price_cents', sa.Integer, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('paid', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('notes', sa.Text, nullable=True),
    )
    op.create_table('tutoring_sessions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('tutor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('subject_id', UUID(as_uuid=True), sa.ForeignKey('subjects.id'), nullable=True),
        sa.Column('session_date', sa.DateTime, nullable=False),
        sa.Column('duration_minutes', sa.Integer, nullable=False, server_default='60'),
        sa.Column('rate_cents', sa.Integer, nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='completed'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('homework_given', sa.Text, nullable=True),
        sa.Column('package_id', UUID(as_uuid=True), sa.ForeignKey('tutoring_packages.id'), nullable=True),
        sa.Column('invoiced', sa.Boolean, nullable=False, server_default='false'),
    )
    op.create_table('tutoring_invoices',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('tutor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('period_label', sa.String(50), nullable=True),
        sa.Column('line_items', JSONB, nullable=True, server_default='[]'),
        sa.Column('total_cents', sa.Integer, nullable=False, server_default='0'),
        sa.Column('paid', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('paid_at', sa.DateTime, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
    )
    op.create_index('ix_tutoring_sessions_tutor', 'tutoring_sessions', ['tutor_id'])
    op.create_index('ix_tutoring_sessions_student', 'tutoring_sessions', ['student_id'])
    op.create_index('ix_tutoring_invoices_tutor', 'tutoring_invoices', ['tutor_id'])


def downgrade() -> None:
    op.drop_index('ix_tutoring_invoices_tutor', 'tutoring_invoices')
    op.drop_index('ix_tutoring_sessions_student', 'tutoring_sessions')
    op.drop_index('ix_tutoring_sessions_tutor', 'tutoring_sessions')
    op.drop_table('tutoring_invoices')
    op.drop_table('tutoring_sessions')
    op.drop_table('tutoring_packages')
