"""add wallet tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-02 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'wallets',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('balance_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='EUR'),
        sa.Column('last_topped_up', sa.DateTime(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    op.create_table(
        'wallet_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('wallet_id', sa.UUID(), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('reference_type', sa.String(length=50), nullable=True),
        sa.Column('reference_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'service_catalog',
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('unit_price_cents', sa.Integer(), nullable=False),
        sa.Column('billing_period', sa.String(length=20), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'service_subscriptions',
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('service_id', sa.UUID(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('days_of_week', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['service_catalog.id']),
        sa.ForeignKeyConstraint(['student_id'], ['users.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('service_subscriptions')
    op.drop_table('service_catalog')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')
