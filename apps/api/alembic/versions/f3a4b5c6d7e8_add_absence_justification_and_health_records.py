"""Add absence_justifications and health_records tables

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-03-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision = 'f3a4b5c6d7e8'
down_revision = 'e2f3a4b5c6d7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('absence_justifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('submitted_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('absence_date', sa.Date, nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('document_url', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_absence_just_student', 'absence_justifications', ['student_id'])
    op.create_index('ix_absence_just_date', 'absence_justifications', ['absence_date'])

    op.create_table('health_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('allergies', sa.Text, nullable=True),
        sa.Column('medical_conditions', sa.Text, nullable=True),
        sa.Column('medications', sa.Text, nullable=True),
        sa.Column('doctor_name', sa.String(200), nullable=True),
        sa.Column('doctor_phone', sa.String(50), nullable=True),
        sa.Column('emergency_contact_name', sa.String(200), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(50), nullable=True),
        sa.Column('emergency_contact_relation', sa.String(50), nullable=True),
        sa.Column('blood_type', sa.String(10), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
    )
    op.create_index('ix_health_records_student', 'health_records', ['student_id'])


def downgrade() -> None:
    op.drop_index('ix_health_records_student', 'health_records')
    op.drop_table('health_records')
    op.drop_index('ix_absence_just_date', 'absence_justifications')
    op.drop_index('ix_absence_just_student', 'absence_justifications')
    op.drop_table('absence_justifications')
