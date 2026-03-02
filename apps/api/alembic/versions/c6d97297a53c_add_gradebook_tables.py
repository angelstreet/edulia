"""add gradebook tables

Revision ID: c6d97297a53c
Revises: 50798174365a
Create Date: 2026-03-02 06:59:09.796934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6d97297a53c'
down_revision: Union[str, None] = '50798174365a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('grade_categories',
    sa.Column('subject_id', sa.UUID(), nullable=False),
    sa.Column('group_id', sa.UUID(), nullable=False),
    sa.Column('term_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('weight', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.ForeignKeyConstraint(['term_id'], ['terms.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_grade_categories_tenant_id'), 'grade_categories', ['tenant_id'], unique=False)
    op.create_table('assessments',
    sa.Column('subject_id', sa.UUID(), nullable=False),
    sa.Column('group_id', sa.UUID(), nullable=False),
    sa.Column('term_id', sa.UUID(), nullable=False),
    sa.Column('category_id', sa.UUID(), nullable=True),
    sa.Column('teacher_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('max_score', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('coefficient', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('is_published', sa.Boolean(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('tenant_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['grade_categories.id'], ),
    sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ),
    sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.ForeignKeyConstraint(['term_id'], ['terms.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assessments_tenant_id'), 'assessments', ['tenant_id'], unique=False)
    op.create_table('grades',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('assessment_id', sa.UUID(), nullable=False),
    sa.Column('student_id', sa.UUID(), nullable=False),
    sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('is_absent', sa.Boolean(), nullable=True),
    sa.Column('is_exempt', sa.Boolean(), nullable=True),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('grades')
    op.drop_index(op.f('ix_assessments_tenant_id'), table_name='assessments')
    op.drop_table('assessments')
    op.drop_index(op.f('ix_grade_categories_tenant_id'), table_name='grade_categories')
    op.drop_table('grade_categories')
