"""Add enrollment payment fields and invoice paid_cents

Revision ID: f0a1b2c3d4e5
Revises: e8f9a0b1c2d3
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'f0a1b2c3d4e5'
down_revision = 'e8f9a0b1c2d3'
branch_labels = None
depends_on = None


def upgrade():
    # enrollment_requests: add invoice link + payment threshold
    op.add_column('enrollment_requests', sa.Column('invoice_id', UUID(as_uuid=True), nullable=True))
    op.add_column('enrollment_requests', sa.Column('payment_minimum_cents', sa.Integer, nullable=False, server_default='0'))

    # school_invoices: track paid amount + link back to enrollment
    op.add_column('school_invoices', sa.Column('paid_cents', sa.Integer, nullable=False, server_default='0'))
    op.add_column('school_invoices', sa.Column('enrollment_request_id', UUID(as_uuid=True), nullable=True))


def downgrade():
    op.drop_column('enrollment_requests', 'invoice_id')
    op.drop_column('enrollment_requests', 'payment_minimum_cents')
    op.drop_column('school_invoices', 'paid_cents')
    op.drop_column('school_invoices', 'enrollment_request_id')
