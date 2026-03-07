"""Add stripe_payment_intent_id to wallet_transactions

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-03-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'd1e2f3a4b5c6'
down_revision = 'c0d1e2f3a4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('wallet_transactions',
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True, unique=True)
    )
    op.create_index('ix_wallet_tx_stripe_pi', 'wallet_transactions', ['stripe_payment_intent_id'])


def downgrade() -> None:
    op.drop_index('ix_wallet_tx_stripe_pi', 'wallet_transactions')
    op.drop_column('wallet_transactions', 'stripe_payment_intent_id')
