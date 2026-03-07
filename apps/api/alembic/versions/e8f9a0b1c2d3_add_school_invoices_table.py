"""Add school_invoices table

Revision ID: e8f9a0b1c2d3
Revises: a4b5c6d7e8f9
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = 'e8f9a0b1c2d3'
down_revision = 'a4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'school_invoices',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('now()')),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('created_by', UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), nullable=False),
        sa.Column('student_name', sa.String(200), nullable=False),
        sa.Column('student_class', sa.String(100), nullable=True),
        sa.Column('parent_name', sa.String(200), nullable=True),
        sa.Column('parent_address', JSONB, nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column('academic_year', sa.String(20), nullable=False),
        sa.Column('issue_date', sa.Date, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('line_items', JSONB, nullable=True, server_default=sa.text("'[]'::jsonb")),
        sa.Column('subtotal_cents', sa.Integer, nullable=False, server_default='0'),
        sa.Column('previous_balance_cents', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_due_cents', sa.Integer, nullable=False, server_default='0'),
        sa.Column('payment_schedule', JSONB, nullable=True, server_default=sa.text("'[]'::jsonb")),
        sa.Column('payment_method', sa.String(100), nullable=True),
        sa.Column('payment_reference', sa.String(100), nullable=True),
        sa.Column('bank_account', sa.String(50), nullable=True),
        sa.Column('contact_info', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
    )
    op.create_index('ix_school_invoices_tenant', 'school_invoices', ['tenant_id'])
    op.create_index('ix_school_invoices_student', 'school_invoices', ['student_id'])


def downgrade():
    op.drop_index('ix_school_invoices_student', 'school_invoices')
    op.drop_index('ix_school_invoices_tenant', 'school_invoices')
    op.drop_table('school_invoices')
