"""add_course_subscriptions_table

Revision ID: add_course_subscriptions
Revises: add_course_ratings
Create Date: 2026-03-03 10:32:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_course_subscriptions'
down_revision = 'add_course_ratings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'course_subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subscribed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id']),
        sa.UniqueConstraint('user_id', 'course_id')
    )


def downgrade() -> None:
    op.drop_table('course_subscriptions')
