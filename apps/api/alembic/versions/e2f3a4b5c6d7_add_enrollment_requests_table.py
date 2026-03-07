"""Add enrollment_requests table

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-03-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = 'e2f3a4b5c6d7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'enrollment_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('parent_first_name', sa.String(100), nullable=False),
        sa.Column('parent_last_name', sa.String(100), nullable=False),
        sa.Column('parent_email', sa.String(255), nullable=False),
        sa.Column('parent_phone', sa.String(50), nullable=True),
        sa.Column('child_first_name', sa.String(100), nullable=False),
        sa.Column('child_last_name', sa.String(100), nullable=False),
        sa.Column('child_date_of_birth', sa.DateTime, nullable=True),
        sa.Column('child_gender', sa.String(20), nullable=True),
        sa.Column('requested_group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('admin_notes', sa.Text, nullable=True),
        sa.Column('reviewed_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
        sa.Column('documents', JSONB, nullable=True, server_default='[]'),
        sa.Column('student_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('submitted_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_enrollment_requests_tenant_status', 'enrollment_requests', ['tenant_id', 'status'])
    op.create_index('ix_enrollment_requests_parent_email', 'enrollment_requests', ['parent_email'])


def downgrade() -> None:
    op.drop_index('ix_enrollment_requests_parent_email', 'enrollment_requests')
    op.drop_index('ix_enrollment_requests_tenant_status', 'enrollment_requests')
    op.drop_table('enrollment_requests')
