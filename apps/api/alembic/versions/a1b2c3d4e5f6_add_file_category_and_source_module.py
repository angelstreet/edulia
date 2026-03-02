"""add file category and source_module columns

Revision ID: a1b2c3d4e5f6
Revises: 5648cbc5d685
Create Date: 2026-03-02 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5648cbc5d685'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('files', sa.Column('category', sa.String(length=50), nullable=True, server_default='general'))
    op.add_column('files', sa.Column('source_module', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('files', 'source_module')
    op.drop_column('files', 'category')
